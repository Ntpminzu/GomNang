import { hashSync } from 'bcryptjs'
import { HttpError } from '../../common/errors/http-error.ts'
import { log } from '../../infrastructure/logging/logger.ts'
import { isUniqueViolation } from '../auth/auth.repository.ts'
import type { AdminDeps, CreateVerifierInput } from './admin.types.ts'

export async function createVerifier(input: CreateVerifierInput, actorId: string, deps: AdminDeps) {
  try {
    const row = await deps.db.transaction(async (tx) => {
      if (await deps.auth.findAccountByEmail(tx, input.email)) throw new HttpError(409, 'EMAIL_EXISTS', 'Email đã có tài khoản. Không thay đổi tài khoản cũ.')
      return deps.auth.insertAccount(tx, {
        displayName: input.name, email: input.email.toLowerCase(), phone: input.phone ?? null,
        passwordHash: hashSync(input.password, 10), role: 'verifier', identityVerified: false,
      })
    })
    log('info', 'verifier created', { actorId, targetId: row.id })
    return { id: row.id, name: row.displayName, email: row.email, createdAt: row.createdAt.toISOString() }
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'EMAIL_EXISTS', 'Email đã có tài khoản. Không thay đổi tài khoản cũ.')
    throw err
  }
}
