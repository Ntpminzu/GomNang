import { and, eq } from 'drizzle-orm'
import type { Db } from '../../infrastructure/database/client.ts'
import { chatRequests } from '../../infrastructure/database/schema.ts'

export async function beginRequest(db: Db, row: typeof chatRequests.$inferInsert) {
  await db.insert(chatRequests).values(row)
}

export async function completeRequest(db: Db, id: string, values: Partial<typeof chatRequests.$inferInsert>) {
  const rows = await db.update(chatRequests).set(values)
    .where(and(eq(chatRequests.id, id), eq(chatRequests.lifecycle, 'pending'))).returning({ id: chatRequests.id })
  if (rows.length !== 1) throw new Error('CHAT_LOG_NOT_PENDING')
}
