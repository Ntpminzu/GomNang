import { DEMO_IDS, DEMO_USERS } from '@gomnang/shared/demo-data.ts'

/** Vai trò của từng tài khoản trong dữ liệu mẫu, để người thử biết nên chọn ai. */
export const ACCOUNT_HINTS: Record<string, string> = {
  [DEMO_IDS.users.khanh]: 'điều phối dự án Hoa Mai',
  [DEMO_IDS.users.an]: 'điều phối dự án sách giáo khoa',
  [DEMO_IDS.users.mai]: 'phụ trách tài chính dự án Hoa Mai',
  [DEMO_IDS.users.hung]: 'chưa xác minh danh tính',
  [DEMO_IDS.users.tam]: 'người xác minh',
}

/** Tài khoản mẫu không có mật khẩu — chỉ vào được bằng đăng nhập nhanh (POST /api/auth/dev-login). */
export const DEMO_ACCOUNTS = DEMO_USERS.map((u) => ({
  id: u.id,
  email: u.email,
  name: u.displayName,
  hint: ACCOUNT_HINTS[u.id] ?? '',
}))
