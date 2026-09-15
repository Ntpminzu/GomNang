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

/**
 * Chỉ đăng nhập mới cần hash. Trả hash tách riêng khỏi UserRow để nó không lọt vào toMember, response hay log.
 * `passwordHash` là null với tài khoản mẫu.
 */
export async function findCredentialsByEmail(
  exec: Exec,
  email: string,
): Promise<{ user: UserRow; passwordHash: string | null } | null> {
  const [row] = await exec.select().from(users).where(eq(users.email, email))
  return row ? { user: toUserRow(row), passwordHash: row.passwordHash } : null
}

/** Email trùng thì PostgreSQL ném lỗi unique violation (23505) — service đổi thành 409. */
export async function insertUser(
  exec: Exec,
  values: { email: string; displayName: string; passwordHash: string },
): Promise<UserRow> {
  const [row] = await exec
    .insert(users)
    .values({ ...values, verified: false, isVerifier: false })
    .returning()
  return toUserRow(row)
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
