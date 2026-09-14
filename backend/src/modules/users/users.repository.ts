import { asc, eq, inArray } from 'drizzle-orm'
import type { UserRow } from '@gomnang/shared/types.ts'
import type { Exec } from '../../db/client.ts'
import { users } from '../../db/schema.ts'

const toUserRow = (u: typeof users.$inferSelect): UserRow => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  verified: u.verified,
  isVerifier: u.isVerifier,
})

export async function findUser(exec: Exec, id: string): Promise<UserRow | null> {
  const [row] = await exec.select().from(users).where(eq(users.id, id))
  return row ? toUserRow(row) : null
}

export async function findUserByEmail(exec: Exec, email: string): Promise<UserRow | null> {
  const [row] = await exec.select().from(users).where(eq(users.email, email))
  return row ? toUserRow(row) : null
}

export async function listUsers(exec: Exec): Promise<UserRow[]> {
  return (await exec.select().from(users).orderBy(asc(users.displayName))).map(toUserRow)
}

/** Tra nhiều người một lần, để ghép tên vào dự án, đóng góp và sổ ghi vết. */
export async function usersByIds(exec: Exec, ids: string[]): Promise<Map<string, UserRow>> {
  const unique = [...new Set(ids)]
  const rows = unique.length > 0 ? await exec.select().from(users).where(inArray(users.id, unique)) : []
  return new Map(rows.map((r) => [r.id, toUserRow(r)]))
}
