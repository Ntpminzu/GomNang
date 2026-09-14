import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'
import type { UserRow } from '@gomnang/domain/types.ts'
import { toMember } from '@gomnang/domain/views.ts'
import { HttpError } from '../../common/errors/http-error.ts'
import { log } from '../../infrastructure/logging/logger.ts'
import type { AuthDeps, LoginInput } from './auth.types.ts'
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

export async function authenticate(header: string | undefined, deps: AuthDeps): Promise<UserRow | null> {
  if (!header) return null

  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Header Authorization phải có dạng "Bearer <token>".')
  }

  try {
    // Chỉ chấp nhận HS256: chặn kiểu tấn công đổi thuật toán trong header token.
    const { payload } = await jwtVerify(token, deps.secret, { issuer: ISSUER, algorithms: ['HS256'] })
    const user = payload.sub && z.uuid().safeParse(payload.sub).success ? await deps.users.findUser(deps.db, payload.sub) : null
    if (!user) throw new Error('token trỏ tới tài khoản không tồn tại')
    return user
  } catch (err) {
    log('warn', 'token rejected', { reason: (err as Error).message })
    throw new HttpError(401, 'INVALID_TOKEN', 'Token không hợp lệ hoặc đã hết hạn. Đăng nhập lại.')
  }
}

export async function login(input: LoginInput, deps: AuthDeps) {
  const user = await deps.users.findUserByEmail(deps.db, input.email.toLowerCase())
  if (!user) throw new HttpError(404, 'USER_NOT_FOUND', `Không có tài khoản mẫu nào dùng email ${input.email}.`)
  log('info', 'dev login', { userId: user.id })
  return { token: await signToken(user.id, deps.secret), user: { ...toMember(user), email: user.email } }
}
