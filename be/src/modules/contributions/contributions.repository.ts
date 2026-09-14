import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm'
import type { AssessmentResult } from '@gomnang/domain/assess.ts'
import type { AssessmentRow, AuditRow, ContributionRow, ContributionStatus, NeedItem, NeedRow, ProjectDetail, ProjectInput, ProjectRow, ProjectStatus, ProjectSummary, QueueItem, UserRow } from '@gomnang/domain/types.ts'
import { latestAssessment, toDetail, toNeedItems, toSummary, userRef } from '@gomnang/domain/views.ts'
import type { Exec } from '../../infrastructure/database/client.ts'
import { assessments, auditLog, contributions, needItems, projects, users } from '../../infrastructure/database/schema.ts'
import { toUserRow } from '../users/users.mapper.ts'
import { toProjectRow } from '../projects/projects.mapper.ts'
import { toNeedRow } from '../projects/projects.mapper.ts'
import { toContributionRow } from '../contributions/contributions.mapper.ts'
import { toAuditRow } from '../../infrastructure/audit/audit.mapper.ts'
import { toAssessmentRow } from '../verification/verification.mapper.ts'
export async function findNeed(exec: Exec, id: string): Promise<NeedRow | null> {
  const [row] = await exec.select().from(needItems).where(eq(needItems.id, id))
  return row ? toNeedRow(row) : null
}

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
