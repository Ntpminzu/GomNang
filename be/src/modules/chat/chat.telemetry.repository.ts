import type { Db } from '../../infrastructure/database/client.ts'
import { chatRequests } from '../../infrastructure/database/schema.ts'

export async function saveRequest(db: Db, row: typeof chatRequests.$inferInsert) {
  await db.insert(chatRequests).values(row)
}
