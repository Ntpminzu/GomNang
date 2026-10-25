import { compareSync } from 'bcryptjs'
import { HttpError } from '../../common/errors/http-error.ts'
import { issueSession, passwordOnly } from './auth.service.ts'
import { isUniqueViolation } from './auth.repository.ts'
import type { AuthDeps } from './auth.types.ts'
import type { GoogleProfile } from './auth.oauth.ts'
import type { LinkCandidate } from './auth.oauth-state.ts'

export async function completeGoogle(profile: GoogleProfile, deps: AuthDeps) {
  try {
    return await deps.db.transaction(async (tx) => {
      const identity = await deps.auth.findIdentity(tx, profile.subject)
      if (identity) {
        const account = await deps.auth.findAccount(tx, identity.userId, true)
        if (!account || account.role !== 'user') throw passwordOnly()
        return { status: 'authenticated' as const, ...await issueSession(tx, account, 'google', deps) }
      }
      const existing = await deps.auth.findAccountByEmail(tx, profile.email, true)
      if (existing) {
        if (existing.role !== 'user') throw passwordOnly()
        if (!existing.passwordHash) throw new HttpError(409, 'ACCOUNT_LINK_UNAVAILABLE', 'Tài khoản cũ chưa có mật khẩu. Liên hệ người quản trị để được hỗ trợ.')
        return { status: 'link_required' as const, candidate: { id: existing.id, email: existing.email, passwordHash: existing.passwordHash } }
      }
      const account = await deps.auth.insertAccount(tx, { displayName: profile.name, email: profile.email, role: 'user', identityVerified: false })
      await deps.auth.linkIdentity(tx, account.id, profile.subject)
      return { status: 'authenticated' as const, ...await issueSession(tx, account, 'google', deps) }
    })
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'OAUTH_CONFLICT', 'Tài khoản vừa được thay đổi. Bắt đầu đăng nhập Google lại.')
    throw err
  }
}
export async function confirmGoogle(profile: GoogleProfile, candidate: LinkCandidate, password: string, deps: AuthDeps) {
  try {
    return await deps.db.transaction(async (tx) => {
      const account = await deps.auth.findAccount(tx, candidate.id, true)
      if (!account || account.role !== 'user') throw passwordOnly()
      if (account.email !== candidate.email || account.passwordHash !== candidate.passwordHash) throw new HttpError(409, 'OAUTH_CONFLICT', 'Tài khoản đã thay đổi. Bắt đầu đăng nhập lại.')
      if (!account.passwordHash || !compareSync(password, account.passwordHash)) throw new HttpError(422, 'LINK_PASSWORD_INVALID', 'Mật khẩu tài khoản cũ không chính xác.')
      if (await deps.auth.findIdentity(tx, profile.subject)) throw new HttpError(409, 'OAUTH_CONFLICT', 'Danh tính Google đã được liên kết. Bắt đầu đăng nhập lại.')
      await deps.auth.linkIdentity(tx, account.id, profile.subject)
      return issueSession(tx, account, 'google', deps)
    })
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'OAUTH_CONFLICT', 'Tài khoản đã có liên kết Google. Bắt đầu đăng nhập lại.')
    throw err
  }
}
