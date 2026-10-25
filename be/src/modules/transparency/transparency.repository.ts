import { eq } from 'drizzle-orm'
import type { ExpenseRow, FileMeta } from '@gomnang/domain/types.ts'
import type { Exec } from '../../infrastructure/database/client.ts'
import { expenses, files, projectUpdates } from '../../infrastructure/database/schema.ts'
import { toExpenseRow } from './transparency.mapper.ts'

export async function insertUpdate(exec: Exec, values: { projectId: string; authorId: string; body: string }): Promise<string> {
  const [row] = await exec.insert(projectUpdates).values(values).returning({ id: projectUpdates.id })
  return row.id
}

export async function insertExpense(
  exec: Exec,
  values: {
    projectId: string
    needItemId: string
    amount: number
    description: string
    receiptUrl: string | null
    receiptFileId: string | null
    recordedBy: string
  },
): Promise<string> {
  const [row] = await exec.insert(expenses).values(values).returning({ id: expenses.id })
  return row.id
}

export async function insertFile(
  exec: Exec,
  values: { projectId: string; uploadedBy: string; name: string; mime: string; size: number; data: Uint8Array },
): Promise<FileMeta> {
  const [row] = await exec.insert(files).values(values).returning({ id: files.id, name: files.name, mime: files.mime, size: files.size })
  return row
}

/** Thông tin file (không kèm nội dung) và trạng thái khoản chi đang gắn nó; null nếu chưa gắn. */
export async function findFile(exec: Exec, id: string) {
  const [row] = await exec
    .select({
      id: files.id,
      projectId: files.projectId,
      uploadedBy: files.uploadedBy,
      name: files.name,
      mime: files.mime,
      size: files.size,
      expenseStatus: expenses.status,
    })
    .from(files)
    .leftJoin(expenses, eq(expenses.receiptFileId, files.id))
    .where(eq(files.id, id))
  return row ?? null
}

export async function fileData(exec: Exec, id: string): Promise<Uint8Array> {
  const [row] = await exec.select({ data: files.data }).from(files).where(eq(files.id, id))
  return row.data
}

export async function findExpense(exec: Exec, id: string, opts: { lock?: boolean } = {}): Promise<ExpenseRow | null> {
  const query = exec.select().from(expenses).where(eq(expenses.id, id))
  const [row] = opts.lock ? await query.for('update') : await query
  return row ? toExpenseRow(row) : null
}

export async function setExpenseReview(exec: Exec, id: string, status: 'approved' | 'rejected', reviewedBy: string, reviewReason: string | null) {
  await exec.update(expenses).set({ status, reviewedBy, reviewReason, updatedAt: new Date() }).where(eq(expenses.id, id))
}
