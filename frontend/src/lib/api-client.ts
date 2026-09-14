import type { ApiErrorBody } from '@gomnang/shared/types.ts'
import { clearSession, getToken } from './session.ts'

/**
 * Nền tảng gọi backend: gắn token, đặt thời hạn, và quy mọi lỗi về một kiểu ApiError.
 * Hàm gọi từng endpoint nằm trong features/<tính năng>/<tính năng>.api.ts.
 *
 * File này, session.ts và các file *.api.ts dùng import tương đối, KHÔNG dùng `@/`:
 * test trong frontend/test/ chạy thẳng bằng Node, mà Node không hiểu alias `@/` của Next.js.
 */

export class ApiError extends Error {
  /** Mã HTTP. `0` nghĩa là không nhận được response nào: mất mạng, máy chủ tắt, bị CORS chặn hoặc quá hạn. */
  status: number
  code: string
  details: Record<string, string> | undefined

  constructor(status: number, code: string, message: string, details?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  return new ApiError(0, 'UNKNOWN', err instanceof Error ? err.message : 'Lỗi không xác định.')
}

/**
 * Địa chỉ backend. Next.js chép giá trị NEXT_PUBLIC_API_URL thẳng vào code lúc build,
 * nên đổi địa chỉ thì phải build lại web. Đọc trong hàm để test đổi được địa chỉ lúc chạy.
 */
export function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '')
}

export const REQUEST_TIMEOUT_MS = 15_000

export async function request<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['content-type'] = 'application/json'
  if (token) headers.authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(apiBaseUrl() + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (err) {
    // fetch chỉ ném lỗi khi không nhận được response nào. Mã HTTP 4xx/5xx không rơi vào đây.
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new ApiError(0, 'TIMEOUT', `Máy chủ không phản hồi sau ${REQUEST_TIMEOUT_MS / 1000} giây. Thử lại sau.`)
    }
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Không kết nối được máy chủ. Kiểm tra mạng, hoặc máy chủ có đang chạy không, rồi thử lại.',
    )
  }

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      // Không phải JSON — thường là trang lỗi của proxy hoặc nhà cung cấp hosting đứng trước máy chủ.
    }
  }

  if (!res.ok) {
    const error = (data as ApiErrorBody | null)?.error
    // Token hết hạn hoặc máy chủ đổi khoá ký: xoá phiên, lần tải trang sau sẽ về trạng thái khách.
    if (res.status === 401 && token) clearSession()
    throw new ApiError(
      res.status,
      error?.code ?? `HTTP_${res.status}`,
      error?.message ?? `Máy chủ trả lỗi HTTP ${res.status}.`,
      error?.details,
    )
  }
  return data as T
}

/** Mã hoá một đoạn đường dẫn, để id lạ không phá được URL. */
export const seg = (value: string) => encodeURIComponent(value)
