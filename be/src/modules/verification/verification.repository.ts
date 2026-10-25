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

import { loadChildren } from '../projects/projects.repository.ts'
import { usersById } from '../users/users.repository.ts'
export async function listQueue(exec: Exec): Promise<QueueItem[]> {
  const rows = (
    await exec.select().from(projects).where(eq(projects.status, 'pending_verification')).orderBy(asc(projects.updatedAt))
  ).map(toProjectRow)
  if (rows.length === 0) return []

  const ids = rows.map((p) => p.id)
  const children = await loadChildren(exec, ids)
  const assessmentRows = (await exec.select().from(assessments).where(inArray(assessments.projectId, ids))).map(toAssessmentRow)
  const userMap = await usersById(exec, rows.map((p) => p.coordinatorId))

  return rows.map((p) => ({
    ...toSummary(p, children.needs, children.contributions),
    coordinator: userRef(userMap, p.coordinatorId),
    latestAssessment: latestAssessment(assessmentRows, p.id),
  }))
}

export async function insertAssessment(exec: Exec, projectId: string, result: AssessmentResult, source: 'rules' | 'ai' = 'rules') {
  await exec.insert(assessments).values({ projectId, source, ...result })
}
