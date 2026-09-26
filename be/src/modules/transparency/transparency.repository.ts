import { eq } from 'drizzle-orm'
import type { ExpenseRow } from '@gomnang/domain/types.ts'
import type { Exec } from '../../infrastructure/database/client.ts'
import { expenses, projectUpdates } from '../../infrastructure/database/schema.ts'
import { toExpenseRow } from './transparency.mapper.ts'

export async function insertUpdate(exec: Exec, values: { projectId: string; authorId: string; body: string }): Promise<string> {
  const [row] = await exec.insert(projectUpdates).values(values).returning({ id: projectUpdates.id })
  return row.id
}

export async function insertExpense(
  exec: Exec,
  values: { projectId: string; needItemId: string; amount: number; description: string; receiptUrl: string | null; recordedBy: string },
): Promise<string> {
  const [row] = await exec.insert(expenses).values(values).returning({ id: expenses.id })
  return row.id
}

export async function findExpense(exec: Exec, id: string, opts: { lock?: boolean } = {}): Promise<ExpenseRow | null> {
  const query = exec.select().from(expenses).where(eq(expenses.id, id))
  const [row] = opts.lock ? await query.for('update') : await query
  return row ? toExpenseRow(row) : null
}

export async function setExpenseReview(exec: Exec, id: string, status: 'approved' | 'rejected', reviewedBy: string, reviewReason: string | null) {
  await exec.update(expenses).set({ status, reviewedBy, reviewReason, updatedAt: new Date() }).where(eq(expenses.id, id))
}
