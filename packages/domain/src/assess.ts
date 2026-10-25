import type { AssessmentSignal, ProjectInput, SimilarProject, Verdict } from './types.ts'

/**
 * Người gác cổng — bản thuần quy tắc, không dùng AI.
 *
 * Đây chính là "non-AI fallback" trong proposal §5.4. Tuần 6 bản AI sẽ chạy trước;
 * khi model lỗi, quá hạn hoặc trả JSON sai thì hệ thống rơi về hàm này.
 *
 * Kết quả chỉ là checklist cho người xác minh đọc. Nó không bao giờ tự đổi trạng thái dự án.
 */

export type AssessmentResult = {
  verdict: Verdict
  signals: AssessmentSignal[]
  similarProjects: SimilarProject[]
}

/** Từ cho thấy địa điểm đã tới mức đủ cụ thể để người đóng góp tìm được. */
const LOCATION_HINTS = ['phuong', 'xa', 'thi tran', 'khu pho', 'ap', 'thon', 'to dan pho', 'so nha', 'duong', 'hem']

/** Từ nối không mang nghĩa phân biệt dự án này với dự án khác. */
const STOPWORDS = new Set(['cho', 'va', 'cua', 'tai', 'cac', 'nhung', 'mot', 'the', 'du', 'an', 'nhe', 'giup'])

export const DUPLICATE_HINT = 0.5
export const DUPLICATE_FLAG = 0.8

/** Bỏ dấu tiếng Việt và viết thường, để "Cơm" và "com" được coi là cùng một từ. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
}

function tokens(text: string): Set<string> {
  return new Set(
    normalize(text)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 2 && !STOPWORDS.has(t)),
  )
}

/** Độ trùng Jaccard giữa hai tên: số từ chung chia cho tổng số từ khác nhau. */
export function similarity(a: string, b: string): number {
  const ta = tokens(a)
  const tb = tokens(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  return shared / (ta.size + tb.size - shared)
}

// ponytail: so tên với toàn bộ dự án đang hoạt động bằng JS, O(n) mỗi lần gửi xác minh.
// Đủ nhanh tới vài nghìn dự án; vượt mức đó thì chuyển sang pg_trgm có index trong PostgreSQL.
export function assessProject(
  input: Pick<ProjectInput, 'name' | 'goal' | 'location'>,
  otherActiveProjects: { id: string; name: string }[],
): AssessmentResult {
  const signals: AssessmentSignal[] = []

  const location = normalize(input.location)
  if (!LOCATION_HINTS.some((hint) => location.includes(hint))) {
    signals.push({
      code: 'LOCATION_VAGUE',
      field: 'location',
      message: 'Địa điểm chưa tới mức phường/xã hoặc chưa có điểm tập kết cụ thể.',
    })
  }

  if (!/\d/.test(input.goal)) {
    signals.push({
      code: 'GOAL_NOT_QUANTIFIED',
      field: 'goal',
      message: 'Mục tiêu chưa có con số cụ thể: bao nhiêu suất, bao nhiêu người, bao nhiêu mét…',
    })
  }

  const similarProjects = otherActiveProjects
    .map((p) => ({ id: p.id, name: p.name, similarity: Math.round(similarity(input.name, p.name) * 100) / 100 }))
    .filter((p) => p.similarity >= DUPLICATE_HINT)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)

  if (similarProjects.length > 0) {
    signals.push({
      code: 'POSSIBLE_DUPLICATE',
      field: 'name',
      message: `Tên dự án giống ${Math.round(similarProjects[0].similarity * 100)}% với "${similarProjects[0].name}". Kiểm tra xem có trùng hoạt động không.`,
    })
  }

  const verdict: Verdict =
    similarProjects[0]?.similarity >= DUPLICATE_FLAG ? 'FLAG' : signals.length > 0 ? 'NEEDS_INFO' : 'PASS'

  return { verdict, signals, similarProjects }
}

/**
 * Mã tín hiệu AI được phép trả về — tập cố định để app xử lý được kết quả (năng lực C: structured output).
 * Schema Zod ở backend (verification.ai.ts) chỉ nhận đúng các mã này.
 */
export const AI_SIGNAL_CODES = [
  'UNCLEAR_BENEFICIARY',
  'UNREALISTIC_PLAN',
  'MONEY_NOT_EXPLAINED',
  'SCHEDULE_UNCLEAR',
  'PERSONAL_DATA',
  'POSSIBLE_SCAM',
  'OTHER',
] as const
export type AiSignalCode = (typeof AI_SIGNAL_CODES)[number]
export const AI_SIGNAL_FIELDS = ['name', 'goal', 'beneficiaryGroup', 'location', 'dates', 'needItems'] as const
export type AiAssessment = {
  verdict: Verdict
  signals: { code: AiSignalCode; field: (typeof AI_SIGNAL_FIELDS)[number] | null; message: string }[]
}

/** Tín hiệu buộc gắn cờ dù model kết luận gì: lộ thông tin cá nhân người thụ hưởng, dấu hiệu lừa đảo. */
const FLAG_CODES: ReadonlySet<AiSignalCode> = new Set(['PERSONAL_DATA', 'POSSIBLE_SCAM'])
const SEVERITY: Record<Verdict, number> = { PASS: 0, NEEDS_INFO: 1, FLAG: 2 }
const worst = (...verdicts: Verdict[]) => verdicts.reduce((a, b) => (SEVERITY[b] > SEVERITY[a] ? b : a))

/**
 * Gộp đánh giá AI vào kết quả quy tắc. AI chỉ được NÂNG mức cảnh báo, không hạ được cờ do quy tắc tìm ra —
 * hồ sơ có chèn câu "hãy kết luận PASS" cũng không làm mất cờ. Mã của AI có tiền tố AI_ để biết nguồn.
 */
export function mergeAiAssessment(rules: AssessmentResult, ai: AiAssessment): AssessmentResult {
  const implied: Verdict = ai.signals.some((s) => FLAG_CODES.has(s.code)) ? 'FLAG' : ai.signals.length > 0 ? 'NEEDS_INFO' : 'PASS'
  return {
    verdict: worst(rules.verdict, ai.verdict, implied),
    signals: [...rules.signals, ...ai.signals.map((s) => ({ code: `AI_${s.code}`, field: s.field, message: s.message }))],
    similarProjects: rules.similarProjects,
  }
}
