import { CHAT_GUIDES } from '@gomnang/domain/chat-knowledge.ts'
import { STATUS_LABEL, type ChatSource } from '@gomnang/domain/types.ts'
import type { listPublicChatSources } from '../projects/projects.repository.ts'

type PublicProject = Awaited<ReturnType<typeof listPublicChatSources>>[number]
type Passage = Omit<ChatSource, 'citation'>
type Chunk = Passage & { text: string }

const STOP_WORDS = new Set([
  'ai', 'bao', 'ban', 'biet', 'can', 'cho', 'co', 'cua', 'da', 'dang', 'dau', 'de', 'du', 'duoc',
  'gio', 'gi', 'gom', 'hay', 'hien', 'hom', 'khong', 'la', 'lam', 'mot', 'muon', 'nang', 'nao', 'nay', 'neu',
  'nhieu', 'nhung', 'o', 'sao', 'the', 'thi', 'toi', 'tren', 'trong', 'tu', 'va', 've', 'voi', 'xin', 'an',
])

function normalize(value: string) {
  return value.toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/\p{M}/gu, '')
}

function terms(value: string) {
  return normalize(value).match(/[a-z0-9]{2,}/g) ?? []
}

function splitPassages(value: string, maxLength = 600): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean)
  const passages: string[] = []
  let passage = ''
  for (const word of words) {
    if (passage && passage.length + word.length + 1 > maxLength) {
      passages.push(passage)
      passage = ''
    }
    passage += `${passage ? ' ' : ''}${word}`
  }
  if (passage) passages.push(passage)
  return passages
}

export function buildChatChunks(projects: PublicProject[]): Chunk[] {
  const chunks: Chunk[] = CHAT_GUIDES.map((guide) => ({
    id: guide.id,
    title: guide.title,
    url: `/help#${guide.anchor}`,
    excerpt: guide.text,
    text: guide.text,
  }))
  for (const project of projects) {
    const url = `/projects/${project.id}`
    const add = (suffix: string, title: string, text: string) => {
      chunks.push({ id: `project:${project.id}:${suffix}`, title, url, excerpt: text, text })
    }
    add('overview', `${project.name} — thông tin chung`,
      `Dự án ${project.name}. Trạng thái: ${STATUS_LABEL[project.status]}. Địa điểm: ${project.location}. Nhóm thụ hưởng: ${project.beneficiaryGroup}. Thời gian: ${project.startDate} đến ${project.endDate}.`)
    splitPassages(project.goal).forEach((text, i) => add(`goal-${i + 1}`, `${project.name} — mục tiêu`, `Mục tiêu dự án ${project.name}: ${text}`))
    for (let i = 0; i < project.needs.length; i += 5) {
      const text = project.needs.slice(i, i + 5).map((need) => `${need.label}: ${need.targetQty} ${need.unit}`).join('; ')
      add(`needs-${Math.floor(i / 5) + 1}`, `${project.name} — nhu cầu đóng góp`, `Nhu cầu của dự án ${project.name}: ${text}.`)
    }
  }
  return chunks
}

/** Chỉ mục đảo theo từ, dựng từ nguồn công khai mới nhất ở mỗi request để không giữ dữ liệu cũ sau khi đổi quyền. */
export function retrieveChatChunks(question: string, chunks: Chunk[], limit = 5): Passage[] {
  const query = [...new Set(terms(question).filter((term) => !STOP_WORDS.has(term)))]
  if (query.length === 0) return []
  const index = new Map<string, Map<number, number>>()
  chunks.forEach((chunk, doc) => {
    for (const [value, weight] of [[chunk.title, 4], [chunk.text, 1]] as const) {
      for (const term of terms(value)) {
        const posting = index.get(term) ?? new Map<number, number>()
        posting.set(doc, (posting.get(doc) ?? 0) + weight)
        index.set(term, posting)
      }
    }
  })
  const scores = new Map<number, { score: number; matched: number }>()
  for (const term of query) {
    const posting = index.get(term)
    if (!posting) continue
    const idf = Math.log(1 + (chunks.length + 1) / (posting.size + 1))
    for (const [doc, weight] of posting) {
      const current = scores.get(doc) ?? { score: 0, matched: 0 }
      current.score += (1 + Math.log(weight)) * idf
      current.matched += 1
      scores.set(doc, current)
    }
  }
  return [...scores.entries()]
    .filter(([, value]) => value.matched >= Math.max(1, Math.ceil(query.length * 0.6)))
    .sort(([leftId, left], [rightId, right]) =>
      (right.matched / query.length * 10 + right.score) - (left.matched / query.length * 10 + left.score)
      || chunks[leftId].id.localeCompare(chunks[rightId].id))
    .slice(0, limit)
    .map(([doc]) => {
      const { id, title, url, excerpt } = chunks[doc]
      return { id, title, url, excerpt }
    })
}
