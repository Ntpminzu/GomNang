import { hashSync } from 'bcryptjs'
import { HttpError } from '../../common/errors/http-error.ts'
import { log } from '../../infrastructure/logging/logger.ts'
import { isUniqueViolation } from '../auth/auth.repository.ts'
import type { AdminDeps, CreateVerifierInput } from './admin.types.ts'
import { z } from 'zod'
import type { AiUsagePeriod } from '@gomnang/domain/ai-usage.ts'
import { parseBody } from '../../common/middleware/validation.ts'

export const MAX_AI_USAGE_RANGE_DAYS = 92
const DAY_MS = 86_400_000
const usageQuery = z.strictObject({
  period: z.enum(['24h', '7d', '30d']).optional(),
  from: z.iso.date().optional(), to: z.iso.date().optional(),
})

export function resolveAiUsageRange(query: unknown, now: Date): AiUsagePeriod {
  const input = parseBody(usageQuery, query)
  const invalid = (message: string): never => { throw new HttpError(400, 'BAD_REQUEST', message, { period: message }) }
  if (input.period !== undefined && (input.from !== undefined || input.to !== undefined)) invalid('Chỉ chọn period hoặc from/to.')
  if ((input.from === undefined) !== (input.to === undefined)) invalid('Cần cả from và to.')
  let from: number, to = now.getTime()
  if (input.from !== undefined && input.to !== undefined) {
    from = Date.parse(input.from + 'T00:00:00+07:00')
    const lastDay = Date.parse(input.to + 'T00:00:00+07:00')
    if (from > lastDay) invalid('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.')
    if (from > to) invalid('Ngày bắt đầu không được sau hôm nay (giờ Việt Nam).')
    if ((lastDay - from) / DAY_MS + 1 > MAX_AI_USAGE_RANGE_DAYS) invalid('Khoảng đo tối đa 92 ngày.')
    to = Math.min(lastDay + DAY_MS, to)
  } else {
    const days = { '24h': 1, '7d': 7, '30d': 30 }[input.period ?? '7d']
    from = to - days * DAY_MS
  }
  return { from: new Date(from).toISOString(), to: new Date(to).toISOString(), timezone: 'Asia/Ho_Chi_Minh' }
}

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
