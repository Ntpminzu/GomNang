import { CHAT_GUIDES } from '@gomnang/domain/chat-knowledge.ts'
import type { ChatGuardReason, ChatSource, ChatTurn } from '@gomnang/domain/types.ts'

export const GUARD_REPLIES: Record<ChatGuardReason | 'UNSAFE_SOURCES', string> = {
  PROMPT_INJECTION: 'Mình không thể làm theo yêu cầu bỏ quy tắc, đổi vai hoặc tiết lộ chỉ dẫn nội bộ. Bạn hãy hỏi lại phần nội dung hợp lệ về GomNang.',
  PRIVATE_DATA_REQUEST: 'Mình chỉ hỗ trợ dữ liệu dự án đã công khai, không cung cấp dữ liệu tài khoản hoặc thông tin riêng tư. Bạn hãy hỏi lại trong phạm vi công khai.',
  SECRET_INPUT: 'Câu hỏi hoặc lịch sử có dấu hiệu chứa thông tin xác thực. Mình chưa gửi nội dung này tới AI; hãy bỏ mật khẩu, token hoặc key rồi hỏi lại.',
  UNSAFE_SOURCES: 'Mình chưa tìm được nguồn phù hợp để sử dụng an toàn cho câu hỏi này. Bạn có thể kiểm tra trang dự án hoặc hỏi cụ thể hơn.',
}

function normalize(value: string) {
  return value.normalize('NFKC').replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim()
}

const injectionPatterns = [
  /\b(?:ignore|disregard|override|forget)\b.{0,80}\b(?:instructions?|rules?|system|policies|prompts?)\b/,
  /\b(?:bo qua|vo hieu hoa|khong tuan theo|quen di)\b.{0,80}\b(?:quy tac|chi dan|huong dan|lenh|prompt|he thong)\b/,
  /\b(?:act as|pretend to be|you are now|switch roles?|dong vai|doi vai|ban la)\b.{0,50}\b(?:admin|administrator|developer|system|quan tri|nha phat trien|khong gioi han|unrestricted|dan)\b/,
  /\b(?:show|reveal|print|dump|display|repeat|return|export|tell me|give me|send me|in|lay|tiet lo|hien thi|cho xem|cho toi|cho minh|cung cap|doc ra|viet ra|sao chep|xuat ra)\b.{0,80}\b(?:system[ _-]?prompt|prompt he thong|chi dan (?:noi bo|he thong)|hidden instructions?|api[ _-]?key|jwt[ _-]?secret|client[ _-]?secret|(?:access|refresh)[ _-]?token|cau hinh (?:may chu|noi bo|backend)|server config|bien moi truong|environment variables?|env|file \.env)\b/,
  /\b(?:system[ _-]?prompt|prompt he thong)\b.{0,30}\b(?:cua ban|cua he thong)\b/,
  /(?:<\|(?:im_start|start_header_id)\|>\s*(?:system|developer|assistant)|<\/?(?:system|developer)>|<<sys>>|\[(?:system|developer)\]|"role"\s*:\s*"(?:system|developer)"|\b(?:role|vai tro)\s*[:=]\s*(?:system|developer|admin)\b)/,
]

const privateRequestPatterns = [
  /\b(?:liet ke|cho xem|cho toi xem|hien thi|cung cap|truy cap|lay|doc|xem|show|list|read|retrieve|access|reveal)\b.{0,90}\b(?:du an (?:(?:ban|dang|o trang thai) )?nhap|du an chua cong khai|ban nhap (?:du an|cua)|draft projects?|private projects?|pending_verification|du lieu tai khoan|thong tin (?:rieng tu|noi bo)|private user data)\b/,
  /\b(?:email|so dien thoai|phone|mat khau|password|dia chi nha|cccd|cmnd)\b.{0,65}\b(?:cua (?:nguoi dung|tai khoan|nguoi dong gop)|of (?:users?|accounts?|donors?))\b/,
  /\b(?:liet ke|lay|cho xem|cung cap|show|list|reveal)\b.{0,60}\b(?:nguoi thu huong|beneficiaries)\b.{0,60}\b(?:rieng tu|khong cong khai|cccd|cmnd|private|passport)\b/,
  /\b(?:lay|in|hien thi|cung cap|show|print|reveal)\b.{0,50}\b(?:mat khau|password|tokens?)\b.{0,50}\b(?:nguoi dung|tai khoan|users?|accounts?)\b/,
]

/** Các dấu hiệu có cấu trúc; không coi email/phone công khai là secret. */
function containsSecret(value: string) {
  return /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(value)
    || /\b(?:AIza[0-9A-Za-z_-]{30,}|sk-(?:proj-)?[0-9A-Za-z_-]{20,}|gh[pousr]_[0-9A-Za-z]{20,})\b/.test(value)
    || /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/.test(value)
    || /\bpostgres(?:ql)?:\/\/[^\s/:]+:[^\s@]+@/i.test(value)
    || /\bbearer\s+[a-z0-9._~-]{16,}\b/i.test(value)
    || /\b(?:password|passwd|mat[_ ]?khau|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|jwt[_ -]?secret|client[_ -]?secret|database[_ -]?url|authorization|token|secret|key)\b\s*[:=]\s*["']?(?:(?:bearer|basic)\s+)?[^\s"'<>]{6,}/i.test(normalize(value))
    || /\b(?:cccd|cmnd|passport|national id)\s*[:=]\s*[a-z0-9-]{6,}/i.test(normalize(value))
}

/** shortcut: nhận diện theo mẫu, chưa hiểu mọi cách diễn đạt/che giấu; mở rộng bằng eval ở giai đoạn 6. */
export function inspectChatText(value: string): ChatGuardReason | null {
  if (containsSecret(value)) return 'SECRET_INPUT'
  const text = normalize(value)
  if (injectionPatterns.some((pattern) => pattern.test(text))) return 'PROMPT_INJECTION'
  if (privateRequestPatterns.some((pattern) => pattern.test(text))) return 'PRIVATE_DATA_REQUEST'
  return null
}

/** Kiểm cả history nhận được, trước khi lọc/cắt ngắn; không tin role assistant do client gửi. */
export function inspectChatInput(message: string, history: ChatTurn[]): ChatGuardReason | null {
  for (const text of [message, ...history.map((turn) => turn.content)]) {
    const issue = inspectChatText(text)
    if (issue) return issue
  }
  return inspectChatText([message, ...history.map((turn) => turn.content)].join('\n'))
}

export function inspectSourceText(value: string): ChatGuardReason | null {
  const issue = inspectChatText(value)
  if (issue) return issue
  const text = normalize(value)
  // Chỉ chặn mệnh lệnh gửi rõ tới chatbot; "ai" có thể là đại từ tiếng Việt.
  if (/\b(?:tro ly|chatbot|assistant)\s*[:,]?\s+(?:hay|phai|must|should)\s+(?:noi|tra loi|keu goi|say|answer|reply|respond|ignore)\b/.test(text)) return 'PROMPT_INJECTION'
  return null
}

type SourceDocument = { id: string; projectId: string | null; title: string; url: string; content: string }
export type IndexedChatSource = ChatSource & { projectId: string | null }

function canonicalSourceUrl(source: SourceDocument) {
  if (source.projectId !== null) {
    const match = /^project:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):chunk-[1-9]\d*$/i.exec(source.id)
    return match?.[1] === source.projectId && source.url === `/projects/${source.projectId}`
  }
  const guide = CHAT_GUIDES.find((item) => source.id === item.id || new RegExp(`^${item.id}:chunk-[1-9]\\d*$`).test(source.id))
  return !!guide && source.url === `/help#${guide.anchor}`
}

function sourceGroup(source: SourceDocument) {
  return source.projectId === null ? source.id.replace(/:chunk-\d+$/, '') : `project:${source.projectId}`
}

export function isSafeSource(source: SourceDocument) {
  return canonicalSourceUrl(source) && !inspectSourceText([source.title, source.content].join('\n'))
}

/** Một chunk độc hại làm loại cả nhóm dự án/hướng dẫn trong bộ đầu vào. Không sửa bản ghi gốc. */
export function filterSafeIndexChunks<T extends SourceDocument>(chunks: T[]): T[] {
  const blocked = new Set(chunks.filter((chunk) => !isSafeSource(chunk)).map(sourceGroup))
  return chunks.filter((chunk) => !blocked.has(sourceGroup(chunk)))
}

export function filterSafeChatSources(candidates: IndexedChatSource[]) {
  const documents = candidates.map(({ excerpt, ...source }) => ({ ...source, content: excerpt }))
  const safeIds = new Set(filterSafeIndexChunks(documents).map((source) => source.id))
  const sources: ChatSource[] = candidates.filter((source) => safeIds.has(source.id)).map(({ id, title, url, excerpt, citation }) => ({ id, title, url, excerpt, citation }))
  return { sources, excluded: candidates.length - sources.length }
}
