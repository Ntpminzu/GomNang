import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm'
import type { AssessmentResult } from '@gomnang/domain/assess.ts'
import { PUBLIC_PROJECT_STATUSES, type AssessmentRow, type AuditRow, type ContributionRow, type ContributionStatus, type NeedItem, type NeedRow, type ProjectDetail, type ProjectInput, type ProjectRow, type ProjectStatus, type ProjectSummary, type QueueItem, type UserRow } from '@gomnang/domain/types.ts'
import { latestAssessment, toDetail, toNeedItems, toSummary, userRef } from '@gomnang/domain/views.ts'
import type { Exec } from '../../infrastructure/database/client.ts'
import { assessments, auditLog, contributions, needItems, projects, users } from '../../infrastructure/database/schema.ts'
import { toUserRow } from '../users/users.mapper.ts'
import { toProjectRow } from '../projects/projects.mapper.ts'
import { toNeedRow } from '../projects/projects.mapper.ts'
import { toContributionRow } from '../contributions/contributions.mapper.ts'
import { toAuditRow } from '../../infrastructure/audit/audit.mapper.ts'
import { toAssessmentRow } from '../verification/verification.mapper.ts'

import { usersById } from '../users/users.repository.ts'
const projectContent = (input: ProjectInput) => ({
  name: input.name,
  goal: input.goal,
  beneficiaryGroup: input.beneficiaryGroup,
  location: input.location,
  startDate: input.startDate,
  endDate: input.endDate,
  treasurerId: input.treasurerId,
})

export async function findProject(exec: Exec, id: string, opts: { lock?: boolean } = {}): Promise<ProjectRow | null> {
  const query = exec.select().from(projects).where(eq(projects.id, id))
  const [row] = opts.lock ? await query.for('update') : await query
  return row ? toProjectRow(row) : null
}

export async function loadChildren(exec: Exec, projectIds: string[]) {
  if (projectIds.length === 0) return { needs: [] as NeedRow[], contributions: [] as ContributionRow[] }
  const needRows = await exec.select().from(needItems).where(inArray(needItems.projectId, projectIds))
  const contributionRows = await exec.select().from(contributions).where(inArray(contributions.projectId, projectIds))
  return { needs: needRows.map(toNeedRow), contributions: contributionRows.map(toContributionRow) }
}

export async function loadDetail(exec: Exec, id: string): Promise<ProjectDetail | null> {
  const project = await findProject(exec, id)
  if (!project) return null

  const { needs, contributions: contributionRows } = await loadChildren(exec, [id])
  const auditRows = (await exec.select().from(auditLog).where(eq(auditLog.projectId, id)).orderBy(asc(auditLog.at))).map(toAuditRow)
  const assessmentRows = (await exec.select().from(assessments).where(eq(assessments.projectId, id))).map(toAssessmentRow)

  const userMap = await usersById(exec, [
    project.coordinatorId,
    ...(project.treasurerId ? [project.treasurerId] : []),
    ...contributionRows.map((c) => c.contributorId),
    ...auditRows.map((a) => a.actorId),
  ])

  return toDetail({ project, needs, contributions: contributionRows, audit: auditRows, assessments: assessmentRows, users: userMap })
}

export async function listSummaries(exec: Exec, statuses: readonly ProjectStatus[]): Promise<ProjectSummary[]> {
  const rows = (
    await exec.select().from(projects).where(inArray(projects.status, [...statuses])).orderBy(desc(projects.createdAt))
  ).map(toProjectRow)
  const children = await loadChildren(exec, rows.map((p) => p.id))
  return rows.map((p) => toSummary(p, children.needs, children.contributions))
}

/** Chỉ các trường đã công khai, phục vụ tìm đoạn nguồn cho chatbot. */
export async function listPublicChatSources(exec: Exec) {
  const rows = await exec.select({
    id: projects.id,
    name: projects.name,
    goal: projects.goal,
    status: projects.status,
    beneficiaryGroup: projects.beneficiaryGroup,
    location: projects.location,
    startDate: projects.startDate,
    endDate: projects.endDate,
  }).from(projects).where(inArray(projects.status, [...PUBLIC_PROJECT_STATUSES]))
  if (rows.length === 0) return []
  const needs = await exec.select({
    projectId: needItems.projectId,
    label: needItems.label,
    unit: needItems.unit,
    targetQty: needItems.targetQty,
  }).from(needItems).where(inArray(needItems.projectId, rows.map((row) => row.id))).orderBy(asc(needItems.position))
  const needsByProject = new Map<string, typeof needs>()
  for (const need of needs) {
    const group = needsByProject.get(need.projectId) ?? []
    group.push(need)
    needsByProject.set(need.projectId, group)
  }
  return rows.map((row) => ({ ...row, needs: needsByProject.get(row.id) ?? [] }))
}

export async function activeProjectNames(exec: Exec, excludeId: string): Promise<{ id: string; name: string }[]> {
  return exec
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(inArray(projects.status, ['pending_verification', 'published', 'in_progress']), ne(projects.id, excludeId)))
}

export async function loadProjectInput(exec: Exec, project: ProjectRow): Promise<ProjectInput> {
  const needRows = await exec.select().from(needItems).where(eq(needItems.projectId, project.id)).orderBy(asc(needItems.position))
  return {
    name: project.name,
    goal: project.goal,
    beneficiaryGroup: project.beneficiaryGroup,
    location: project.location,
    startDate: project.startDate,
    endDate: project.endDate,
    treasurerId: project.treasurerId,
    needItems: needRows.map((n) => ({ label: n.label, unit: n.unit, kind: n.kind, targetQty: n.targetQty })),
  }
}

export async function replaceNeeds(exec: Exec, projectId: string, items: ProjectInput['needItems']) {
  await exec.delete(needItems).where(eq(needItems.projectId, projectId))
  if (items.length === 0) return
  await exec
    .insert(needItems)
    .values(items.map((n, position) => ({ projectId, label: n.label, unit: n.unit, kind: n.kind, targetQty: n.targetQty, position })))
}

export async function insertProject(exec: Exec, input: ProjectInput, coordinatorId: string): Promise<string> {
  const [row] = await exec
    .insert(projects)
    .values({ ...projectContent(input), coordinatorId, status: 'draft' })
    .returning({ id: projects.id })
  await replaceNeeds(exec, row.id, input.needItems)
  return row.id
}

export async function updateProjectContent(exec: Exec, id: string, input: ProjectInput) {
  await exec.update(projects).set({ ...projectContent(input), updatedAt: new Date() }).where(eq(projects.id, id))
  await replaceNeeds(exec, id, input.needItems)
}

export async function setProjectStatus(exec: Exec, id: string, status: ProjectStatus, rejectionReason: string | null) {
  await exec.update(projects).set({ status, rejectionReason, updatedAt: new Date() }).where(eq(projects.id, id))
}

/** Huỷ dự án thì giải phóng mọi cam kết chưa bàn giao; trả về id để ghi vết từng cái. */
export async function releaseCommitments(exec: Exec, projectId: string): Promise<string[]> {
  const rows = await exec
    .update(contributions)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(eq(contributions.projectId, projectId), eq(contributions.status, 'committed')))
    .returning({ id: contributions.id })
  return rows.map((r) => r.id)
}

export async function setProjectReport(exec: Exec, id: string, report: string) {
  await exec.update(projects).set({ report, updatedAt: new Date() }).where(eq(projects.id, id))
}
