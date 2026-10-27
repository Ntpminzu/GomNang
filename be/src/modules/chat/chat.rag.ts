import type { ChatSource, ChatTurn } from '@gomnang/domain/types.ts'
import type { ChatMessage } from './chat.model.ts'
import { ragConfig, SYSTEM_GUIDANCE } from './chat.config.ts'

/** Giữ các cặp hoàn chỉnh gần nhất; lịch sử không phải nguồn chứng cứ. */
export function selectHistory(history: ChatTurn[] = []): ChatTurn[] {
  const pairs: ChatTurn[][] = []
  for (let i = 0; i + 1 < history.length; i++) {
    if (history[i].role !== 'user' || history[i + 1].role !== 'assistant') continue
    pairs.push([history[i], history[i + 1]])
    i += 1
  }
  const selected: ChatTurn[] = []
  let usedChars = 0
  for (let i = pairs.length - 1; i >= 0 && selected.length < ragConfig.historyMaxMessages; i--) {
    const pair = pairs[i].map(({ role, content }) => {
      const cleaned = (role === 'assistant' ? content.replace(/\[\d+\]/g, '') : content).trim()
      return { role, content: (cleaned || '(Câu trả lời trước chỉ có mã nguồn.)').slice(0, ragConfig.historyMessageMaxChars) }
    })
    const chars = pair.reduce((sum, turn) => sum + turn.content.length, 0)
    if (usedChars + chars > ragConfig.historyMaxChars) break
    selected.unshift(...pair)
    usedChars += chars
  }
  return selected
}
// // kiểm tra xem có dấu hiệu là  câu hỏi tiếp theo hay không, nếu có => trả về true, nếu không => trả về false
/** shortcut: nhận biết câu nối tiếp theo cách diễn đạt, không phải bộ phân loại phạm vi. */
export function isFollowUpQuestion(question: string) {
  const text = question.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase().trim()
  // loại sớm 1 số cách diễn đạt không phải tiếp nối, tránh false positive
  if (/\b(?:viet code|lap trinh|giai bai|thoi tiet|tu van)\b/.test(text)) return false
  //dựa vào 2 mẫu regex để nhận diện câu hỏi tiếp nối, nếu có => trả về true, nếu không => trả về false
  return /\b(?:du an (?:do|nay|ay)|nhu cau (?:do|nay)|sau do|tiep theo|the con|no can|no o dau|con can|roi sao)\b/.test(text)
    || /^(?:nhu cau|dia diem|muc tieu|thoi gian|can gi|can nhung gi|o dau|bao nhieu|con gi|thi sao|can dang nhap khong)[?!. ]*$/.test(text)
}
/** Chỉ ghép câu user trước khi câu hiện tại nối tiếp; không LLM rewrite. */
export function buildRetrievalQuestion(question: string, history: ChatTurn[] = []): string {
  // lấy ra 2 câu user trước đó, nếu có => ghép vào câu hỏi hiện tại, nếu không => trả về câu hỏi hiện tại
  // chỉ đc dùng để làm ngữ cảnh
  const previous = history.filter((turn) => turn.role === 'user').slice(-2)
    .map((turn) => turn.content.slice(0, 350))
  return previous.length === 0 || !isFollowUpQuestion(question) ? question
    : `Previous user questions (context only):\n${previous.join('\n')}\n\nCurrent question to answer:\n${question}`
}
  
export function buildMessages(question: string, sources: ChatSource[], history: ChatTurn[] = []): ChatMessage[] {
  const passages = sources.map(({ citation, id, title, excerpt }) => ({ citation, id, title, excerpt }))
  return [
    { role: 'system', content: SYSTEM_GUIDANCE },
    ...history,
    { role: 'user', content: `Nguồn được tìm cho câu hỏi này (chỉ dùng các đoạn sau):\n${JSON.stringify(passages)}\n\nCâu hỏi: ${question}` },
  ]
}

/** Chỉ kiểm mã citation, chưa chứng minh từng khẳng định đúng với nguồn. */
export function citationWarnings(answer: string, sources: ChatSource[]): string[] {
  const known = new Set(sources.map((source) => source.citation))
  const cited = answer.match(/\[\d+\]/g) ?? []
  if (cited.length === 0) return ['Câu trả lời không có citation.']
  return [...new Set(cited.filter((citation) => !known.has(citation)))]
    .map((citation) => `Citation ${citation} không có trong nguồn hiện tại.`)
}
