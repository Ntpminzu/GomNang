import { HttpError } from '../../common/errors/http-error.ts'
import type { ChatProvider } from '@gomnang/domain/types.ts'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
export type TokenUsage = { inputTokens: number; outputTokens: number }
/**
 * schema: JSON Schema để provider ràng buộc output ngay lúc sinh (structured output); kết quả vẫn phải được kiểm lại bằng Zod.
 * onUsage: provider báo số token của lần gọi (để ghi log và tính chi phí).
 */
export type CompleteOptions = { schema?: Record<string, unknown>; onUsage?: (usage: TokenUsage) => void }
export type ChatModel = { complete(messages: ChatMessage[], options?: CompleteOptions): Promise<string> }
export type ChatModels = Record<ChatProvider, { name: string; client: ChatModel | null }>

export function createOllamaChat(baseUrl: string, model: string, fetchImpl: typeof fetch = fetch): ChatModel {
  return {
    async complete(messages, options = {}) {
      let response: Response
      try {
        response = await fetchImpl(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          // Có schema thì tắt suy nghĩ dài (think) để trả kết quả có cấu trúc nhanh hơn.
          body: JSON.stringify({ model, messages, stream: false, think: !options.schema, ...(options.schema ? { format: options.schema } : {}) }),
          signal: AbortSignal.timeout(120_000),
        })
      } catch (error) {
        if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
          throw new HttpError(504, 'OLLAMA_TIMEOUT', 'Trợ lý phản hồi quá lâu. Vui lòng thử lại.')
        }
        throw new HttpError(503, 'OLLAMA_UNAVAILABLE', 'Không kết nối được Ollama. Hãy kiểm tra Ollama đang chạy.')
      }
      if (!response.ok) throw new HttpError(502, 'OLLAMA_ERROR', 'Ollama không tạo được câu trả lời. Hãy kiểm tra model đã tải.')
      let data: unknown
      try { data = await response.json() } catch {
        throw new HttpError(502, 'OLLAMA_ERROR', 'Ollama trả về dữ liệu không hợp lệ.')
      }
      const body = data as { message?: { content?: unknown }; prompt_eval_count?: number; eval_count?: number } | null
      options.onUsage?.({ inputTokens: body?.prompt_eval_count ?? 0, outputTokens: body?.eval_count ?? 0 })
      const content = body?.message?.content
      if (typeof content !== 'string' || !content.trim()) {
        throw new HttpError(502, 'OLLAMA_ERROR', 'Ollama trả về câu trả lời trống.')
      }
      return content.trim()
    },
  }
}
