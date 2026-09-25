import { HttpError } from '../../common/errors/http-error.ts'
import type { ChatProvider } from '@gomnang/domain/types.ts'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
export type ChatModel = { complete(messages: ChatMessage[]): Promise<string> }
export type ChatModels = Record<ChatProvider, { name: string; client: ChatModel | null }>

export function createOllamaChat(baseUrl: string, model: string, fetchImpl: typeof fetch = fetch): ChatModel {
  return {
    async complete(messages) {
      let response: Response
      try {
        response = await fetchImpl(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ model, messages, stream: false, think: true }),
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
      const content = (data as { message?: { content?: unknown } } | null)?.message?.content
      if (typeof content !== 'string' || !content.trim()) {
        throw new HttpError(502, 'OLLAMA_ERROR', 'Ollama trả về câu trả lời trống.')
      }
      return content.trim()
    },
  }
}
