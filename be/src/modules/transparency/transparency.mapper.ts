import type { ExpenseRow, UpdateRow } from '@gomnang/domain/types.ts'
import type { expenses, projectUpdates } from '../../infrastructure/database/schema.ts'
const iso = (value: Date) => value.toISOString()
export const toUpdateRow = (u: typeof projectUpdates.$inferSelect): UpdateRow => ({
  id: u.id,
  projectId: u.projectId,
  authorId: u.authorId,
  body: u.body,
  createdAt: iso(u.createdAt),
})
export const toExpenseRow = (e: typeof expenses.$inferSelect): ExpenseRow => ({
  id: e.id,
  projectId: e.projectId,
  needItemId: e.needItemId,
  amount: e.amount,
  description: e.description,
  receiptUrl: e.receiptUrl,
  receiptFileId: e.receiptFileId,
  status: e.status,
  recordedBy: e.recordedBy,
  reviewedBy: e.reviewedBy,
  reviewReason: e.reviewReason,
  createdAt: iso(e.createdAt),
})
