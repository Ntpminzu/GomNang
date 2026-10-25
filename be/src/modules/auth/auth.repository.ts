import { and, eq, sql } from 'drizzle-orm'
import type { Exec } from '../../infrastructure/database/client.ts'
import { authSessions, oauthIdentities, users } from '../../infrastructure/database/schema.ts'

export async function findAccount(exec: Exec, id: string, lock = false) {
  const query = exec.select().from(users).where(eq(users.id, id))
  return (await (lock ? query.for('update') : query))[0] ?? null
}
export async function findAccountByEmail(exec: Exec, email: string, lock = false) {
  const query = exec.select().from(users).where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
  return (await (lock ? query.for('update') : query))[0] ?? null
}
export async function insertAccount(exec: Exec, data: typeof users.$inferInsert) {
  return (await exec.insert(users).values(data).returning())[0]
}
export async function findSession(exec: Exec, id: string, lock = false) {
  const query = exec.select().from(authSessions).where(eq(authSessions.id, id))
  return (await (lock ? query.for('update') : query))[0] ?? null
}
export async function insertSession(exec: Exec, data: typeof authSessions.$inferInsert) {
  return (await exec.insert(authSessions).values(data).returning())[0]
}
export async function revokeSession(exec: Exec, id: string) {
  await exec.update(authSessions).set({ revokedAt: new Date() }).where(eq(authSessions.id, id))
}
export async function revokeUserSessions(exec: Exec, userId: string) {
  await exec.update(authSessions).set({ revokedAt: new Date() }).where(eq(authSessions.userId, userId))
}
export async function updatePasswordHash(exec: Exec, id: string, passwordHash: string) {
  return (await exec.update(users).set({ passwordHash }).where(eq(users.id, id)).returning())[0]
}
export async function findIdentity(exec: Exec, subject: string) {
  return (await exec.select().from(oauthIdentities).where(and(eq(oauthIdentities.provider, 'google'), eq(oauthIdentities.subject, subject))))[0] ?? null
}
export async function linkIdentity(exec: Exec, userId: string, subject: string) {
  await exec.insert(oauthIdentities).values({ provider: 'google', subject, userId })
}
export function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: unknown } | null
  return !!e && (e.code === '23505' || (!!e.cause && isUniqueViolation(e.cause)))
}
