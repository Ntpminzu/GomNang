import { HttpError } from '../../common/errors/http-error.ts'
// cài đặtt timeout cho các truy vấn chat là 120s
export const CHAT_TIMEOUT_MS = 120_000 

export function chatTimeout() {
  return new HttpError(504, 'CHAT_TIMEOUT', 'Trợ lý không hoàn tất trong thời gian cho phép. Bạn có thể thử lại hoặc sửa câu hỏi.')
}

export function normalizeChatFailure(error: unknown): HttpError {
  if (error instanceof HttpError) return error
  let current: unknown = error
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth++) {
    const item = current as { code?: unknown; message?: unknown; cause?: unknown }
    if (item.code === '57014' || (typeof item.message === 'string' && item.message.includes('Query read timeout'))) {
      return new HttpError(504, 'CHAT_DATABASE_TIMEOUT', 'Truy vấn nguồn AI phản hồi quá lâu. Bạn có thể thử lại sau.')
    }
    if ((typeof item.code === 'string' && /^(?:08|53|ECONN|ENOTFOUND|ETIMEDOUT)/.test(item.code))
      || (typeof item.message === 'string' && item.message.includes('timeout exceeded when trying to connect'))) {
      return new HttpError(503, 'CHAT_DATABASE_UNAVAILABLE', 'Nguồn dữ liệu AI tạm không khả dụng. Vui lòng thử lại sau.')
    }
    current = item.cause
  }
  return new HttpError(500, 'CHAT_INTERNAL', 'Trợ lý gặp lỗi máy chủ. Vui lòng thử lại.')
}

/** Không khởi động bước mới sau abort; bước đã chạy có thể cần thời gian để tự dừng. */
export async function withAbort<T>(signal: AbortSignal | undefined, operation: () => Promise<T>): Promise<T> {
  signal?.throwIfAborted()
  if (!signal) return operation()
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => signal.removeEventListener('abort', onAbort)
    const onAbort = () => { cleanup(); reject(signal.reason) }
    signal.addEventListener('abort', onAbort, { once: true })
    Promise.resolve().then(() => { signal.throwIfAborted(); return operation() }).then((value) => {
      cleanup()
      if (signal.aborted) reject(signal.reason)
      else resolve(value)
    }, (error: unknown) => { cleanup(); reject(error) })
  })
}
 
export function createChatTimeout(timeoutMs = CHAT_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(chatTimeout()), timeoutMs)
  timer.unref()
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer)
      controller.abort(new HttpError(499, 'CHAT_CANCELLED', 'Yêu cầu chat đã kết thúc hoặc bị ngắt kết nối.'))
    },
  }
}
