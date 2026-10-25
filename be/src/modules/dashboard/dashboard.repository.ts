import { and, eq, inArray, isNull, or } from 'drizzle-orm'
import type { DashboardSource } from '@gomnang/domain/dashboard.ts'
import type { UserRow } from '@gomnang/domain/types.ts'
import type { Exec } from '../../infrastructure/database/client.ts'
import { contributions, expenses, projects } from '../../infrastructure/database/schema.ts'
import { loadChildren } from '../projects/projects.repository.ts'
import { toProjectRow } from '../projects/projects.mapper.ts'
import { toExpenseRow } from '../transparency/transparency.mapper.ts'

/** Mọi dự án dính tới một người: điều phối, giữ tiền, từng góp sức, hoặc (người xác minh) đang chờ duyệt. */
export async function sourceFor(exec: Exec, user: Pick<UserRow, 'id' | 'role'>): Promise<DashboardSource> {
  const contributed = exec.select({ id: contributions.projectId }).from(contributions).where(eq(contributions.contributorId, user.id))
  const rows = await exec
    .select()
    .from(projects)
    .where(
      and(
        isNull(projects.deletedAt),
        or(
          eq(projects.coordinatorId, user.id),
          eq(projects.treasurerId, user.id),
          inArray(projects.id, contributed),
          (user.role === 'verifier') ? eq(projects.status, 'pending_verification') : undefined,
        ),
      ),
    )
  const ids = rows.map((r) => r.id)
  const children = await loadChildren(exec, ids)
  const expenseRows = ids.length ? (await exec.select().from(expenses).where(inArray(expenses.projectId, ids))).map(toExpenseRow) : []
  return { projects: rows.map(toProjectRow), ...children, expenses: expenseRows }
}
