import type { Member } from '@gomnang/shared/types.ts'
import type { LoginInput, RegisterInput } from '@gomnang/shared/validate-auth.ts'
import { request } from '../../lib/api-client.ts'

/** Mọi cách đăng nhập trả cùng một hình dạng, nên trình duyệt chỉ lưu một kiểu phiên. */
export type AuthResponse = { token: string; user: Member & { email: string } }

/** POST /api/auth/dev-login — tài khoản mẫu, không mật khẩu. Máy chủ tắt tính năng này thì trả 404. */
export const devLogin = (email: string) => request<AuthResponse>('POST', '/api/auth/dev-login', { email })

/** POST /api/auth/register → 201. Email đã có tài khoản → 409 EMAIL_TAKEN; sai quy tắc → 422 kèm lỗi theo từng ô. */
export const register = (input: RegisterInput) => request<AuthResponse>('POST', '/api/auth/register', input)

/** POST /api/auth/login. Sai email hay sai mật khẩu đều là 401 INVALID_CREDENTIALS. */
export const login = (input: LoginInput) => request<AuthResponse>('POST', '/api/auth/login', input)
