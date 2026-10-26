import { z } from 'zod'
import { HttpError } from '../../common/errors/http-error.ts'
import type { ChatSource } from '@gomnang/domain/types.ts'
import { inspectSourceText } from './chat.guard.ts'
import { QUERY_INSTRUCTION, SYSTEM_GUIDANCE } from './chat.config.ts'
import { citationWarnings } from './chat.rag.ts'

const modelOutput = z.strictObject({
  status: z.enum(['answered', 'refused']),
  reply: z.string().trim().min(1).max(12000),
})

/** Không sửa JSON hoặc gọi model lần hai để cứu output sai. */
export function parseChatOutput(content: string) {
  let value: unknown
  try { value = JSON.parse(content) } catch {
    throw new HttpError(502, 'CHAT_OUTPUT_INVALID', 'Trợ lý trả về dữ liệu không hợp lệ. Bạn có thể thử lại.')
  }
  const parsed = modelOutput.safeParse(value)
  if (!parsed.success) throw new HttpError(502, 'CHAT_OUTPUT_INVALID', 'Trợ lý trả về dữ liệu không hợp lệ. Bạn có thể thử lại.')
  return parsed.data
}

/** Kiểm cấu trúc/secret/mẫu chỉ dẫn/citation, không chứng minh entailment từng mệnh đề. */
export function validateChatAnswer(reply: string, sources: ChatSource[]) {
  const normalized = reply.toLowerCase().replace(/\s+/g, ' ')
  const protectedLines = SYSTEM_GUIDANCE.split('\n').map((line) => line.toLowerCase().replace(/\s+/g, ' ').trim()).filter((line) => line.length >= 80)
  const leaksPrompt = protectedLines.some((line) => normalized.includes(line))
    || normalized.includes(QUERY_INSTRUCTION.toLowerCase())
  if (inspectSourceText(reply) || leaksPrompt) {
    throw new HttpError(502, 'CHAT_OUTPUT_UNSAFE', 'Trợ lý tạo phản hồi không phù hợp để hiển thị. Bạn có thể sửa câu hỏi rồi thử lại.')
  }
  if (citationWarnings(reply, sources).length > 0) {
    throw new HttpError(502, 'CHAT_CITATION_INVALID', 'Trợ lý trả lời thiếu hoặc sai nguồn. Bạn có thể thử lại hoặc sửa câu hỏi.')
  }
}
