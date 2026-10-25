import { HttpError } from '../../common/errors/http-error.ts'
import type { ChatMessage, ChatModel, CompleteOptions } from './chat.model.ts'

function geminiBody(messages: ChatMessage[], options: CompleteOptions) {
  const system = messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n\n')
  const contents = messages.filter((message) => message.role !== 'system').map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }))
  return {
    system_instruction: { parts: [{ text: system }] },
    contents,
    ...(options.schema ? { generationConfig: { responseMimeType: 'application/json', responseJsonSchema: options.schema } } : {}),
  }
}

export function createGeminiChat(apiKey: string, model: string, fetchImpl: typeof fetch = fetch): ChatModel {
  return {
    async complete(messages, options = {}) {
      let response: Response
      try {
        response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(geminiBody(messages, options)),
          signal: AbortSignal.timeout(120_000),
        })
      } catch (error) {
        if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
          throw new HttpError(504, 'GEMINI_TIMEOUT', 'Gemini phản hồi quá lâu. Vui lòng thử lại.')
        }
        throw new HttpError(503, 'GEMINI_UNAVAILABLE', 'Không kết nối được Gemini. Vui lòng thử lại.')
      }
      if (response.status === 401 || response.status === 403) {
        throw new HttpError(503, 'GEMINI_AUTH_ERROR', 'Gemini từ chối API key. Hãy kiểm tra cấu hình backend.')
      }
      if (response.status === 429) throw new HttpError(429, 'GEMINI_RATE_LIMIT', 'Gemini đang giới hạn lượt gọi. Vui lòng thử lại sau.')
      if (response.status === 503) throw new HttpError(503, 'GEMINI_BUSY', 'Gemini đang quá tải. Vui lòng thử lại sau.')
      if (!response.ok) throw new HttpError(502, 'GEMINI_ERROR', 'Gemini không tạo được câu trả lời. Hãy kiểm tra model và quyền truy cập API.')
      let data: unknown
      try { data = await response.json() } catch {
        throw new HttpError(502, 'GEMINI_ERROR', 'Gemini trả về dữ liệu không hợp lệ.')
      }
      const parts = (data as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] } | null)?.candidates?.[0]?.content?.parts
      const content = parts?.map((part) => typeof part.text === 'string' ? part.text : '').join('').trim()
      if (!content) throw new HttpError(502, 'GEMINI_EMPTY', 'Gemini không trả lời câu hỏi này. Hãy thử diễn đạt lại.')
      return content
    },
  }
}
