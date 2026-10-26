import { ApiError } from './errors.ts'
import { expireSession, getSessionSnapshot } from '../session/index.ts'
export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  /** Gửi nguyên nội dung file thay cho JSON; tên file đi qua header `x-file-name` (mã hoá URI). */
  file?: { blob: Blob; name: string }
  /** 'blob' để nhận nội dung file; lỗi vẫn đọc dạng JSON. */
  responseType?: 'json' | 'blob'
  anonymous?: boolean
  timeoutMs?: number
}
export type RequestClient = <T>(path: string, options?: RequestOptions) => Promise<T>
type Options = {
  baseUrl?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
  session?: { read: () => { token: string | null; revision: number }; expire: (revision: number) => void }
}

/** No automatic retry: a failed write may already have reached the server. */
export function createHttpClient(options: Options = {}): RequestClient {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const timeoutMs = options.timeoutMs ?? 15_000
  const session = options.session ?? { read: getSessionSnapshot, expire: expireSession }
  return async <T>(path: string, request: RequestOptions = {}): Promise<T> => {
    const started = session.read()
    const sentToken = !request.anonymous && !!started.token
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), request.timeoutMs ?? timeoutMs)
    let requestId: string | undefined
    const assertCurrent = () => {
      if (session.read().revision !== started.revision) throw new ApiError(409, 'SESSION_CHANGED', 'Phiên đã thay đổi. Vui lòng thử lại với tài khoản hiện tại.')
    }
    try {
      const response = await fetchImpl((options.baseUrl ?? '') + path, {
        method: request.method ?? 'GET',
        headers: {
          accept: request.responseType === 'blob' ? '*/*' : 'application/json',
          ...(request.file
            ? { 'content-type': request.file.blob.type || 'application/octet-stream', 'x-file-name': encodeURIComponent(request.file.name) }
            : request.body === undefined
              ? {}
              : { 'content-type': 'application/json' }),
          ...(sentToken ? { authorization: `Bearer ${started.token}` } : {}),
        },
        body: request.file ? request.file.blob : request.body === undefined ? undefined : JSON.stringify(request.body),
        cache: 'no-store',
        signal: abort.signal,
      })
      requestId = response.headers.get('x-request-id') ?? undefined
      if (request.responseType === 'blob' && response.ok) {
        const blob = await response.blob()
        assertCurrent()
        return blob as T
      }
      const text = await response.text()
      assertCurrent()
      let data: unknown
      try { data = text ? JSON.parse(text) : null } catch {
        if (response.status === 401 && sentToken) session.expire(started.revision)
        throw new ApiError(response.ok ? 502 : response.status, 'INVALID_RESPONSE', 'Máy chủ không trả dữ liệu JSON hợp lệ. Vui lòng thử lại.', undefined, requestId)
      }
      if (!response.ok) {
        if (response.status === 401 && sentToken) session.expire(started.revision)
        const payload = data as { error?: { code?: string; message?: string; details?: Record<string, string>; requestId?: string } } | null
        throw new ApiError(response.status, payload?.error?.code ?? 'HTTP_ERROR', payload?.error?.message ?? 'Không kết nối được dịch vụ. Vui lòng thử lại.', payload?.error?.details, payload?.error?.requestId ?? requestId)
      }
      return data as T
    } catch (err) {
      if (err instanceof ApiError) throw err
      assertCurrent()
      if (abort.signal.aborted) throw new ApiError(504, 'TIMEOUT', 'Máy chủ phản hồi quá lâu. Kiểm tra kết quả trước khi gửi lại.', undefined, requestId)
      throw new ApiError(503, 'NETWORK_ERROR', 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.', undefined, requestId)
    } finally { clearTimeout(timer) }
  }
}
export const request = createHttpClient()
