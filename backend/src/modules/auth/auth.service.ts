import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'
import type { UserRow } from '@gomnang/shared/types.ts'
import { HttpError } from '../../common/errors.ts'
import { log } from '../../common/logger.ts'
import type { Db } from '../../db/client.ts'
import { findUser, findUserByEmail } from '../users/users.repository.ts'

/**
 * Xác thực bằng JWT ký HS256.
 *
 * Tuần 4 phát token qua /api/auth/dev-login (đăng nhập bằng email của tài khoản mẫu, không mật khẩu).
 * Endpoint này tắt khi NODE_ENV=production, trừ khi đặt riêng ALLOW_DEMO_LOGIN_IN_PRODUCTION=true cho bản demo
 * (xem config.ts). Khi nối Supabase Auth, chỉ thay nơi phát token — middleware kiểm tra token giữ nguyên cách dùng.
 */

const ISSUER = 'gomnang-api'
const TOKEN_TTL = '8h'

export async function signToken(userId: string, secret: Uint8Array): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secret)
}

/** Header Authorization → người dùng. Không có header thì là khách (`null`); header sai hoặc token hỏng thì 401. */
export async function userFromAuthorization(
  header: string | undefined,
  db: Db,
  secret: Uint8Array,
): Promise<UserRow | null> {
  if (!header) return null

  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Header Authorization phải có dạng "Bearer <token>".')
  }

  try {
    // Chỉ chấp nhận HS256: chặn kiểu tấn công đổi thuật toán trong header token.
    const { payload } = await jwtVerify(token, secret, { issuer: ISSUER, algorithms: ['HS256'] })
    const user = payload.sub && z.uuid().safeParse(payload.sub).success ? await findUser(db, payload.sub) : null
    if (!user) throw new Error('token trỏ tới tài khoản không tồn tại')
    return user
  } catch (err) {
    log('warn', 'token rejected', { reason: (err as Error).message })
    throw new HttpError(401, 'INVALID_TOKEN', 'Token không hợp lệ hoặc đã hết hạn. Đăng nhập lại.')
  }
}

/** Đăng nhập bằng email của tài khoản mẫu. Route kiểm tra việc bật hay tắt trước khi gọi hàm này. */
export async function devLogin(db: Db, secret: Uint8Array, email: string): Promise<{ token: string; user: UserRow }> {
  const user = await findUserByEmail(db, email.toLowerCase())
  if (!user) throw new HttpError(404, 'USER_NOT_FOUND', `Không có tài khoản mẫu nào dùng email ${email}.`)

  log('info', 'dev login', { userId: user.id })
  return { token: await signToken(user.id, secret), user }
}
