import { eq, inArray } from 'drizzle-orm'
import type { ContributionRow, ContributionStatus, NeedItem, NeedRow } from '@gomnang/shared/types.ts'
import { toNeedItems } from '@gomnang/shared/views.ts'
import type { Exec } from '../../db/client.ts'
import { contributions, needItems } from '../../db/schema.ts'
import { toNeedRow } from '../projects/projects.repository.ts'

const toContributionRow = (c: typeof contributions.$inferSelect): ContributionRow => ({
  id: c.id,
  projectId: c.projectId,
  needItemId: c.needItemId,
  contributorId: c.contributorId,
  quantity: c.quantity,
  status: c.status,
  createdAt: c.createdAt.toISOString(),
})

export async function contributionsForProjects(exec: Exec, projectIds: string[]): Promise<ContributionRow[]> {
  if (projectIds.length === 0) return []
  return (await exec.select().from(contributions).where(inArray(contributions.projectId, projectIds))).map(toContributionRow)
}

export async function findNeed(exec: Exec, id: string): Promise<NeedRow | null> {
  const [row] = await exec.select().from(needItems).where(eq(needItems.id, id))
  return row ? toNeedRow(row) : null
}

/**
 * Khoá hạng mục nhu cầu rồi mới tính tổng đã cam kết. Nếu hai người cùng cam kết phần cuối cùng,
 * người thứ hai phải đợi người thứ nhất ghi xong — nên không bao giờ cam kết vượt mục tiêu.
 */
export async function lockNeedWithTotals(exec: Exec, needId: string): Promise<{ need: NeedRow; totals: NeedItem } | null> {
  const [row] = await exec.select().from(needItems).where(eq(needItems.id, needId)).for('update')
  if (!row) return null
  const need = toNeedRow(row)
  const rows = await exec.select().from(contributions).where(eq(contributions.needItemId, needId))
  const [totals] = toNeedItems([need], rows.map(toContributionRow))
  return { need, totals }
}

export async function insertContribution(
  exec: Exec,
  values: { projectId: string; needItemId: string; contributorId: string; quantity: number },
): Promise<string> {
  const [row] = await exec
    .insert(contributions)
    .values({ ...values, status: 'committed' })
    .returning({ id: contributions.id })
  return row.id
}

export async function findContribution(exec: Exec, id: string, opts: { lock?: boolean } = {}): Promise<ContributionRow | null> {
  const query = exec.select().from(contributions).where(eq(contributions.id, id))
  const [row] = opts.lock ? await query.for('update') : await query
  return row ? toContributionRow(row) : null
}

export async function setContributionStatus(exec: Exec, id: string, status: ContributionStatus) {
  await exec.update(contributions).set({ status, updatedAt: new Date() }).where(eq(contributions.id, id))
}
