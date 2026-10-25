import { SignJWT, jwtVerify } from 'jose'
import { compareSync, hashSync } from 'bcryptjs'
import { z } from 'zod'
import type { LoginResult, SessionUser } from '@gomnang/domain/types.ts'
import { toMember } from '@gomnang/domain/views.ts'
import type { Exec } from '../../infrastructure/database/client.ts'
import type { users, authSessions } from '../../infrastructure/database/schema.ts'
import { HttpError } from '../../common/errors/http-error.ts'
import { log } from '../../infrastructure/logging/logger.ts'
import { isUniqueViolation } from './auth.repository.ts'
import type { AuthContext, AuthDeps, LoginInput, RegisterInput, LoginPasswordInput, ChangePasswordInput } from './auth.types.ts'

const ISSUER = 'gomnang-api'
const invalidSession = () => new HttpError(401, 'INVALID_TOKEN', 'Phiên không hợp lệ hoặc đã hết hạn. Đăng nhập lại.')
export const passwordOnly = () => new HttpError(403, 'PASSWORD_LOGIN_REQUIRED', 'Tài khoản được cấp phải đăng nhập bằng email và mật khẩu.')
export const sessionUser = (user: typeof users.$inferSelect): SessionUser => ({ ...toMember(user), email: user.email })

export async function signToken(userId: string, secret: Uint8Array, session: Pick<typeof authSessions.$inferSelect, 'id' | 'expiresAt'>) {
  return new SignJWT({ sid: session.id })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(userId).setIssuer(ISSUER).setIssuedAt()
    .setExpirationTime(Math.floor(session.expiresAt.getTime() / 1000)).sign(secret)
}
export async function authenticate(header: string | undefined, deps: AuthDeps): Promise<AuthContext | null> {
  if (!header) return null
  const parts = header.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) throw invalidSession()
  let claims
  try {
    claims = (await jwtVerify(parts[1], deps.secret, { issuer: ISSUER, algorithms: ['HS256'] })).payload
  } catch { throw invalidSession() }
  // Never upgrade an old limited token merely because its DB purpose column was removed.
  if (claims.purpose !== undefined && claims.purpose !== 'full') throw invalidSession()
  if (!z.uuid().safeParse(claims.sub).success || !z.uuid().safeParse(claims.sid).success) throw invalidSession()
  // DB failures are 5xx, not evidence that a token is invalid.
  const session = await deps.auth.findSession(deps.db, claims.sid as string)
  if (!session || session.userId !== claims.sub || session.revokedAt || session.expiresAt.getTime() <= Date.now()) throw invalidSession()
  const account = await deps.auth.findAccount(deps.db, session.userId)
  if (!account || (account.role !== 'user' && session.method !== 'password')) throw invalidSession()
  return { user: { ...sessionUser(account), displayName: account.displayName, phone: account.phone }, session }
}
/** Password authentication and credential changes hold the same user lock. */
export async function issueSession(exec: Exec, account: typeof users.$inferSelect, method: 'password' | 'google' | 'dev', deps: AuthDeps): Promise<LoginResult> {
  if (account.role !== 'user' && method !== 'password') throw passwordOnly()
  const session = await deps.auth.insertSession(exec, {
    userId: account.id, method,
    expiresAt: new Date(Date.now() + 8 * 60 * 60_000),
  })
  return { token: await signToken(account.id, deps.secret, session), user: sessionUser(account) }
}
export async function login(input: LoginInput, deps: AuthDeps) {
  return deps.db.transaction(async (tx) => {
    const account = await deps.auth.findAccountByEmail(tx, input.email, true)
    if (!account) throw new HttpError(404, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản mẫu.')
    return issueSession(tx, account, 'dev', deps)
  })
}
export async function register(input: RegisterInput, deps: AuthDeps) {
  try {
    return await deps.db.transaction(async (tx) => {
      if (await deps.auth.findAccountByEmail(tx, input.email)) throw new HttpError(409, 'EMAIL_EXISTS', 'Email này đã được sử dụng.')
      const account = await deps.auth.insertAccount(tx, {
        email: input.email, displayName: input.name, phone: input.phone,
        passwordHash: hashSync(input.password, 10), role: 'user', identityVerified: false,
      })
      return issueSession(tx, account, 'password', deps)
    })
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'EMAIL_EXISTS', 'Email này đã được sử dụng.')
    throw err
  }
}
export async function loginWithPassword(input: LoginPasswordInput, deps: AuthDeps) {
  return deps.db.transaction(async (tx) => {
    const account = await deps.auth.findAccountByEmail(tx, input.email, true)
    if (!account?.passwordHash || !compareSync(input.password, account.passwordHash)) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không chính xác.')
    }
    return issueSession(tx, account, 'password', deps)
  })
}
export async function endSession(context: AuthContext, deps: AuthDeps) {
  await deps.auth.revokeSession(deps.db, context.session.id)
}
export async function changePassword(context: AuthContext, input: ChangePasswordInput, deps: AuthDeps) {
  const result = await deps.db.transaction(async (tx) => {
    const account = await deps.auth.findAccount(tx, context.user.id, true)
    const session = await deps.auth.findSession(tx, context.session.id, true)
    if (!account || !session || session.userId !== account.id || session.revokedAt || session.expiresAt.getTime() <= Date.now()) throw invalidSession()
    if (account.role !== 'verifier' || session.method !== 'password') {
      throw new HttpError(403, 'VERIFIER_REQUIRED', 'Chỉ người kiểm duyệt đăng nhập bằng mật khẩu được sử dụng chức năng này.')
    }
    if (!account.passwordHash || !compareSync(input.currentPassword, account.passwordHash)) {
      throw new HttpError(422, 'CURRENT_PASSWORD_INVALID', 'Mật khẩu hiện tại không chính xác.', { currentPassword: 'Mật khẩu hiện tại không chính xác.' })
    }
    if (compareSync(input.newPassword, account.passwordHash)) throw new HttpError(422, 'PASSWORD_REUSED', 'Mật khẩu mới phải khác mật khẩu hiện tại.', { newPassword: 'Chọn mật khẩu khác mật khẩu hiện tại.' })
    const updated = await deps.auth.updatePasswordHash(tx, account.id, hashSync(input.newPassword, 10))
    await deps.auth.revokeUserSessions(tx, account.id)
    return issueSession(tx, updated, 'password', deps)
  })
  log('info', 'password changed', { userId: context.user.id })
  return result
}
