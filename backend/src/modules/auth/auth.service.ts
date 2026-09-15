import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'
import type { UserRow } from '@gomnang/shared/types.ts'
import {
  normalizeEmail,
  validateLogin,
  validateRegistration,
  type LoginInput,
  type RegisterInput,
} from '@gomnang/shared/validate-auth.ts'
import { HttpError } from '../../common/errors.ts'
import { log } from '../../common/logger.ts'
import type { Db } from '../../db/client.ts'
import { findCredentialsByEmail, findUser, insertUser } from '../users/users.repository.ts'
import { hashPassword, verifyPassword } from './password.ts'

/**
 * Xác thực bằng JWT ký HS256. Ba nơi phát token, cùng một loại token:
 *   - /api/auth/register và /api/auth/login: email + mật khẩu (băm scrypt, xem password.ts). Luôn bật.
 *   - /api/auth/dev-login: đăng nhập nhanh bằng email của tài khoản mẫu, không mật khẩu. Tắt khi NODE_ENV=production,
 *     trừ khi đặt riêng ALLOW_DEMO_LOGIN_IN_PRODUCTION=true cho bản demo (xem config.ts).
 * Middleware kiểm tra token không cần biết token được phát từ đường nào.
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
  const found = await findCredentialsByEmail(db, email.toLowerCase())
  // Tài khoản đã đặt mật khẩu trả lời như email không tồn tại. Nếu không, bản demo bật dev-login thì ai biết email
  // cũng vào được tài khoản người khác, và 200/404 lộ email nào đã đăng ký.
  if (!found || found.passwordHash) throw new HttpError(404, 'USER_NOT_FOUND', `Không có tài khoản mẫu nào dùng email ${email}.`)

  log('info', 'dev login', { userId: found.user.id })
  return { token: await signToken(found.user.id, secret), user: found.user }
}

const EMAIL_TAKEN = 'Email này đã có tài khoản. Hãy đăng nhập.'

/** drizzle bọc lỗi của PostgreSQL trong `cause`, nên xem cả hai lớp. */
const isUniqueViolation = (err: unknown) => {
  const e = err as { code?: string; cause?: { code?: string } }
  return e.code === '23505' || e.cause?.code === '23505'
}

export async function register(db: Db, secret: Uint8Array, input: RegisterInput): Promise<{ token: string; user: UserRow }> {
  const errors = validateRegistration(input)
  if (Object.keys(errors).length > 0) throw new HttpError(422, 'VALIDATION_FAILED', 'Thông tin đăng ký chưa hợp lệ.', errors)

  const passwordHash = await hashPassword(input.password)
  let user: UserRow
  try {
    user = await insertUser(db, { email: normalizeEmail(input.email), displayName: input.displayName.trim(), passwordHash })
  } catch (err) {
    // Không tra trước rồi mới ghi: ràng buộc UNIQUE của cột email chặn luôn cả hai request đăng ký cùng lúc.
    if (isUniqueViolation(err)) throw new HttpError(409, 'EMAIL_TAKEN', EMAIL_TAKEN, { email: EMAIL_TAKEN })
    throw err
  }

  log('info', 'user registered', { userId: user.id })
  return { token: await signToken(user.id, secret), user }
}

// Tạo lần đầu cần tới. Email không có hash vẫn phải chạy scrypt một lần, để thời gian trả lời không lộ email nào đã có tài khoản.
let dummyHash: Promise<string> | undefined

export async function login(db: Db, secret: Uint8Array, input: LoginInput): Promise<{ token: string; user: UserRow }> {
  const errors = validateLogin(input)
  if (Object.keys(errors).length > 0) throw new HttpError(422, 'VALIDATION_FAILED', 'Thông tin đăng nhập chưa hợp lệ.', errors)

  const found = await findCredentialsByEmail(db, normalizeEmail(input.email))
  const matches = await verifyPassword(input.password, found?.passwordHash ?? (await (dummyHash ??= hashPassword('dummy'))))
  // Không có email, tài khoản mẫu chưa đặt mật khẩu, sai mật khẩu: cùng một câu trả lời, không gợi ý là trường hợp nào.
  if (!found?.passwordHash || !matches) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.')

  log('info', 'password login', { userId: found.user.id })
  return { token: await signToken(found.user.id, secret), user: found.user }
}
