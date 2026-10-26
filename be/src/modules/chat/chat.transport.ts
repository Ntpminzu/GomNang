import { HttpError } from '../../common/errors/http-error.ts'
import { CHAT_TIMEOUT_MS, withAbort } from './chat.runtime.ts'

/** schema: JSON Schema của output (structured output, US-8) — model chỉ được sinh đúng khuôn; kết quả vẫn kiểm lại bằng Zod. */
export type ChatCallOptions = { signal?: AbortSignal; schema?: Record<string, unknown> }

export function providerSignal(signal?: AbortSignal) {
  return signal ?? AbortSignal.timeout(CHAT_TIMEOUT_MS)
}

export function providerFailure(error: unknown, signal: AbortSignal, timeout: HttpError, unavailable: HttpError): HttpError {
  if (signal.aborted) return signal.reason instanceof HttpError ? signal.reason : timeout
  if (error instanceof HttpError) return error
  if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) return timeout
  return unavailable
}

/** Giới hạn cả lúc đọc body; không chỉ timeout fetch đến khi nhận headers. */
export async function readProviderJson(response: Response, signal: AbortSignal, maxBytes = 1_048_576): Promise<unknown> {
  signal.throwIfAborted()
  const declared = Number(response.headers.get('content-length'))
  if (declared > maxBytes) {
    void response.body?.cancel().catch(() => {})
    throw new HttpError(502, 'CHAT_RESPONSE_TOO_LARGE', 'Dữ liệu từ dịch vụ AI vượt giới hạn cho phép. Bạn có thể rút gọn câu hỏi rồi thử lại.')
  }
  const reader = response.body?.getReader()
  if (!reader) throw new HttpError(502, 'CHAT_PROVIDER_JSON_INVALID', 'Dịch vụ AI trả dữ liệu không hợp lệ.')
  const decoder = new TextDecoder()
  let size = 0
  let text = ''
  let complete = false
  try {
    while (true) {
      const part = await withAbort(signal, () => reader.read())
      if (part.done) { complete = true; break }
      size += part.value.byteLength
      if (size > maxBytes) throw new HttpError(502, 'CHAT_RESPONSE_TOO_LARGE', 'Dữ liệu từ dịch vụ AI vượt giới hạn cho phép. Bạn có thể rút gọn câu hỏi rồi thử lại.')
      text += decoder.decode(part.value, { stream: true })
    }
    text += decoder.decode()
    signal.throwIfAborted()
    try { return JSON.parse(text) as unknown } catch {
      throw new HttpError(502, 'CHAT_PROVIDER_JSON_INVALID', 'Dịch vụ AI trả dữ liệu không hợp lệ.')
    }
  } finally {
    if (!complete) void reader.cancel().catch(() => {})
    try { reader.releaseLock() } catch { /* Một read bị abort có thể chưa hoàn tất. */ }
  }
}
