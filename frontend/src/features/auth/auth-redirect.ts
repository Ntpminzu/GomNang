import { saveSession } from '../../lib/session.ts'
import type { AuthResponse } from './auth.api.ts'

/**
 * Đăng nhập xong thì quay về trang đang xem dở, ghi trong ?next=.
 * ?next nằm trên URL nên ai gửi link cũng sửa được: chỉ nhận đường dẫn trong chính trang web này,
 * không để link lạ mượn trang đăng nhập đẩy người dùng sang trang khác (open redirect).
 */

const BASE = 'http://gomnang.invalid'

export function safeNext(raw: string | null): string {
  if (!raw?.startsWith('/') || raw.startsWith('//')) return '/'
  // Trình duyệt đọc "\" như "/" và bỏ qua tab, xuống dòng: "/\evil.example" hay "/<tab>/evil.example" đều thành
  // "//evil.example" — trang khác. Để bộ phân tích URL chuẩn quyết định thay vì tự dò từng mẹo.
  try {
    return new URL(raw, BASE).origin === BASE ? raw : '/'
  } catch {
    return '/'
  }
}

/** ?next của địa chỉ hiện tại. Chỉ gọi trên trình duyệt (trong handler hoặc useEffect). */
export const readNext = (): string | null => new URLSearchParams(globalThis.location?.search).get('next')

/** `/login` + `?next=<trang>` nếu có trang cần quay lại. */
export const withNext = (path: string, next: string | null | undefined): string =>
  next ? `${path}?next=${encodeURIComponent(next)}` : path

/** Lưu phiên rồi tải lại cả trang (không dùng router.push), để header và mọi màn hình đọc lại phiên mới. */
export function finishLogin({ token, user }: AuthResponse, next: string | null) {
  saveSession(token, { id: user.id, name: user.name, isVerifier: user.isVerifier })
  window.location.assign(safeNext(next))
}
