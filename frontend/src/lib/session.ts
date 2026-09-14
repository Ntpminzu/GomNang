import type { Actor } from '@gomnang/shared/rules.ts'

/**
 * Phiên đăng nhập trên trình duyệt: token do backend phát (POST /api/auth/dev-login) cùng thông tin người dùng.
 *
 * Thông tin người dùng lưu ở đây chỉ để giao diện biết nên hiện nút nào. Quyền thật do backend
 * quyết định dựa trên token — sửa tay localStorage không làm tăng quyền được.
 *
 * Token nằm trong localStorage: gọn cho bản demo, nhưng script lạ chạy được trên trang (XSS)
 * là đọc được token. Khi làm đăng nhập thật nên chuyển sang cookie httpOnly.
 */

const KEY = 'gomnang.session.v1'

export type SessionUser = Actor & { name: string }
type Session = { token: string; user: SessionUser }

function readSession(): Session | null {
  try {
    const raw = globalThis.localStorage?.getItem(KEY)
    if (!raw) return null
    const { token, user } = JSON.parse(raw) as Partial<Session>
    if (typeof token !== 'string' || typeof user?.id !== 'string' || typeof user.name !== 'string') return null
    return { token, user: { id: user.id, name: user.name, isVerifier: user.isVerifier === true } }
  } catch {
    // Dữ liệu hỏng hoặc trình duyệt chặn localStorage: coi như chưa đăng nhập.
    return null
  }
}

/** `null` = khách chưa đăng nhập. */
export const getSessionUser = (): SessionUser | null => readSession()?.user ?? null
export const getToken = (): string | null => readSession()?.token ?? null

export function saveSession(token: string, user: SessionUser) {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify({ token, user }))
  } catch {
    // Trình duyệt chặn localStorage thì không giữ được phiên — người dùng sẽ ở trạng thái khách.
  }
}

export function clearSession() {
  try {
    globalThis.localStorage?.removeItem(KEY)
  } catch {
    // Không có gì để xoá.
  }
}
