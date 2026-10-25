import { DEMO_IDS, DEMO_USERS } from '@gomnang/domain/demo-data.ts'
import type { Actor } from '@gomnang/domain/rules.ts'

/**
 * Ai đang dùng ứng dụng.
 *
 * Homework 3B chưa có đăng nhập thật: người dùng chọn một tài khoản mẫu ở góc trên màn hình.
 * Homework 4B sẽ thay bằng token lấy từ POST /api/auth/dev-login — các màn hình vẫn chỉ gọi
 * getSessionUser() nên không phải sửa.
 */

const KEY = 'gomnang.currentUserId'
const GUEST = 'guest'

export type SessionUser = import('@gomnang/domain/types.ts').SessionUser

/** Vai trò của từng tài khoản trong dữ liệu mẫu, để người thử biết nên chọn ai. */
const ACCOUNT_HINTS: Record<string, string> = {
  [DEMO_IDS.users.khanh]: 'điều phối dự án Hoa Mai',
  [DEMO_IDS.users.an]: 'điều phối dự án sách giáo khoa',
  [DEMO_IDS.users.mai]: 'phụ trách tài chính dự án Hoa Mai',
  [DEMO_IDS.users.hung]: 'chưa xác minh danh tính',
  [DEMO_IDS.users.tam]: 'người xác minh',
}

export const DEMO_ACCOUNTS = DEMO_USERS.filter((u) => u.role === 'user').map((u) => ({ id: u.id, name: u.displayName, hint: ACCOUNT_HINTS[u.id] ?? '' }))

/** `null` = khách chưa đăng nhập. Lần đầu mở trang thì mặc định là Khanh cho tiện thử. */
export function getSessionUser(): SessionUser | null {
  let stored: string | null = null
  try {
    stored = globalThis.localStorage?.getItem(KEY) ?? null
  } catch {
    // Trình duyệt chặn localStorage: coi như lần đầu mở trang.
  }
  if (stored === GUEST) return null

  const user = DEMO_USERS.find((u) => u.id === (stored ?? DEMO_IDS.users.khanh))
  return user?.role === 'user' ? { id: user.id, role: user.role, name: user.displayName, email: user.email, identityVerified: user.identityVerified } : null
}

export function setSessionUser(id: string | null) {
  if (id && DEMO_USERS.find((u) => u.id === id)?.role !== 'user') id = null
  try {
    globalThis.localStorage?.setItem(KEY, id ?? GUEST)
  } catch {
    // Không lưu được thì lần tải lại sẽ quay về tài khoản mặc định — chấp nhận được cho bản demo.
  }
}
