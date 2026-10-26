import { HttpError } from '../../common/errors/http-error.ts'

export const CHAT_TIMEOUT_MS = 120_000
const FINALIZE_RESERVE_MS = 5_000

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

export class ChatDeadline {
  readonly work = new AbortController()
  readonly total = new AbortController()
  readonly signal: AbortSignal
  private workUntil: number
  private totalUntil: number
  private workTimer: ReturnType<typeof setTimeout>
  private totalTimer: ReturnType<typeof setTimeout>

  constructor(totalMs = CHAT_TIMEOUT_MS, reserveMs = FINALIZE_RESERVE_MS) {
    if (totalMs <= reserveMs || reserveMs < 0) throw new Error('INVALID_CHAT_DEADLINE')
    this.signal = this.work.signal
    this.totalUntil = performance.now() + totalMs
    this.workUntil = this.totalUntil - reserveMs
    this.workTimer = setTimeout(() => this.work.abort(chatTimeout()), totalMs - reserveMs)
    this.totalTimer = setTimeout(() => this.abort(chatTimeout()), totalMs)
    this.workTimer.unref()
    this.totalTimer.unref()
  }

  check(finalize = false) {
    if (performance.now() >= this.totalUntil) this.abort(chatTimeout())
    else if (!finalize && performance.now() >= this.workUntil) this.work.abort(chatTimeout())
    const signal = finalize ? this.total.signal : this.signal
    signal.throwIfAborted()
  }

  async run<T>(operation: () => Promise<T>, finalize = false): Promise<T> {
    this.check(finalize)
    const result = await withAbort(finalize ? this.total.signal : this.signal, operation)
    this.check(finalize)
    return result
  }

  abort(reason: HttpError) {
    this.work.abort(reason)
    this.total.abort(reason)
  }

  dispose() {
    clearTimeout(this.workTimer)
    clearTimeout(this.totalTimer)
    this.abort(new HttpError(499, 'CHAT_CANCELLED', 'Yêu cầu chat đã kết thúc hoặc bị ngắt kết nối.'))
  }
}
