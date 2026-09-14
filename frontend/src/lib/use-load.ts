import { useEffect, useState } from 'react'
import { toApiError, type ApiError } from './api-client.ts'
import { getSessionUser, type SessionUser } from './session.ts'

export type Load<T> = { status: 'loading' } | { status: 'ok'; data: T } | { status: 'error'; error: ApiError }

/**
 * Gọi API khi màn hình mở và trả về đúng một trong ba trạng thái: đang tải / có dữ liệu / lỗi.
 *
 * Người đang dùng được đọc SAU khi trang đã hiện trên trình duyệt, vì lúc Next dựng HTML sẵn
 * trên máy chủ thì chưa có localStorage — đọc sớm sẽ lệch HTML hai phía.
 *
 * `reload()` tải lại mà vẫn giữ dữ liệu cũ trên màn hình trong lúc chờ, để bấm một nút xong
 * không bị cả trang nháy về khung xương.
 */
export function useLoad<T>(fetcher: () => Promise<T>, deps: readonly unknown[] = []) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [state, setState] = useState<Load<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setUser(getSessionUser())
    setState((prev) => (prev.status === 'ok' && attempt > 0 ? prev : { status: 'loading' }))

    let cancelled = false
    fetcher().then(
      (data) => {
        if (!cancelled) setState({ status: 'ok', data })
      },
      (err: unknown) => {
        if (!cancelled) setState({ status: 'error', error: toApiError(err) })
      },
    )
    return () => {
      cancelled = true
    }
    // `fetcher` thường là hàm viết thẳng trong component nên đổi mỗi lần render; phụ thuộc thật nằm trong `deps`.
  }, [attempt, ...deps])

  return { user, state, reload: () => setAttempt((n) => n + 1) }
}
