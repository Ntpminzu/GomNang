import { desc, eq } from 'drizzle-orm'
import type { Exec } from '../../infrastructure/database/client.ts'
import { users } from '../../infrastructure/database/schema.ts'
export async function listVerifiers(exec: Exec) {
  const rows = await exec.select({ id: users.id, name: users.displayName, email: users.email, createdAt: users.createdAt })
    .from(users).where(eq(users.role, 'verifier')).orderBy(desc(users.createdAt))
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
}
