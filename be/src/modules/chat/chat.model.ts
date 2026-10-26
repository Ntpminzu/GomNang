import { HttpError } from '../../common/errors/http-error.ts'
import type { ChatProvider } from '@gomnang/domain/types.ts'
import { providerFailure, providerSignal, readProviderJson, type ChatCallOptions } from './chat.transport.ts'
import { withAbort } from './chat.runtime.ts'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
export type ChatCompletion = {
  content: string
  model: string | null
  inputTokens: number | null
  outputTokens: number | null
  thinkingTokens: number | null
  totalTokens: number | null
}
export type ChatModel = { complete(messages: ChatMessage[], options?: ChatCallOptions): Promise<ChatCompletion> }
export type ChatModels = Record<ChatProvider, { name: string; client: ChatModel | null }>

export function tokenCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

export function reportedModel(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 ? value : null
}

export function createOllamaChat(baseUrl: string, model: string, fetchImpl: typeof fetch = fetch): ChatModel {
  return {
    async complete(messages, options) {
      const signal = providerSignal(options?.signal)
      const timeout = new HttpError(504, 'OLLAMA_TIMEOUT', 'Trợ lý phản hồi quá lâu. Vui lòng thử lại.')
      const unavailable = new HttpError(503, 'OLLAMA_UNAVAILABLE', 'Không kết nối được Ollama. Hãy kiểm tra Ollama đang chạy.')
      let response: Response
      try {
        response = await withAbort(signal, () => fetchImpl(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ model, messages, stream: false, think: true, format: 'json' }),
          signal,
        }))
      } catch (error) {
        throw providerFailure(error, signal, timeout, unavailable)
      }
      if (!response.ok) throw new HttpError(502, 'OLLAMA_ERROR', 'Ollama không tạo được câu trả lời. Hãy kiểm tra model đã tải.')
      let data: unknown
      try { data = await readProviderJson(response, signal) } catch (error) {
        if (error instanceof HttpError && error.code === 'CHAT_PROVIDER_JSON_INVALID') throw new HttpError(502, 'OLLAMA_ERROR', 'Ollama trả về dữ liệu không hợp lệ.')
        throw providerFailure(error, signal, timeout, unavailable)
      }
      const content = (data as { message?: { content?: unknown } } | null)?.message?.content
      if (typeof content !== 'string' || !content.trim()) {
        throw new HttpError(502, 'OLLAMA_ERROR', 'Ollama trả về câu trả lời trống.')
      }
      const payload = data as Record<string, unknown>
      const inputTokens = tokenCount(payload.prompt_eval_count)
      const outputTokens = tokenCount(payload.eval_count)
      return {
        content: content.trim(), model: reportedModel(payload.model), inputTokens, outputTokens,
        thinkingTokens: null,
        totalTokens: inputTokens === null || outputTokens === null ? null : inputTokens + outputTokens,
      }
    },
  }
}
