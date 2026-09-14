import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm'
import type { AssessmentResult } from '@gomnang/shared/assess.ts'
import type {
  AssessmentRow,
  AuditRow,
  ContributionRow,
  ContributionStatus,
  NeedItem,
  NeedRow,
  ProjectDetail,
  ProjectInput,
  ProjectRow,
  ProjectStatus,
  ProjectSummary,
  QueueItem,
  UserRow,
} from '@gomnang/shared/types.ts'
import { latestAssessment, toDetail, toNeedItems, toSummary, userRef } from '@gomnang/shared/views.ts'
import type { Exec } from './client.ts'
import { assessments, auditLog, contributions, needItems, projects, users } from './schema.ts'

/**
 * Tầng dữ liệu: mọi câu truy vấn nằm ở đây. Route không đụng thẳng vào bảng,
 * và file này không chứa quy tắc nghiệp vụ nào — quy tắc nằm ở shared.
 */

// ---------- Đổi dòng database sang dòng domain (Date → chuỗi ISO) ----------

const iso = (value: Date) => value.toISOString()

const toUserRow = (u: typeof users.$inferSelect): UserRow => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  verified: u.verified,
  isVerifier: u.isVerifier,
})

const toProjectRow = (p: typeof projects.$inferSelect): ProjectRow => ({
  id: p.id,
  name: p.name,
  goal: p.goal,
  beneficiaryGroup: p.beneficiaryGroup,
  location: p.location,
  startDate: p.startDate,
  endDate: p.endDate,
  status: p.status,
  coordinatorId: p.coordinatorId,
  treasurerId: p.treasurerId,
  rejectionReason: p.rejectionReason,
  createdAt: iso(p.createdAt),
})

const toNeedRow = (n: typeof needItems.$inferSelect): NeedRow => ({
  id: n.id,
  projectId: n.projectId,
  label: n.label,
  unit: n.unit,
  kind: n.kind,
  targetQty: n.targetQty,
  position: n.position,
})

const toContributionRow = (c: typeof contributions.$inferSelect): ContributionRow => ({
  id: c.id,
  projectId: c.projectId,
  needItemId: c.needItemId,
  contributorId: c.contributorId,
  quantity: c.quantity,
  status: c.status,
  createdAt: iso(c.createdAt),
})

const toAuditRow = (a: typeof auditLog.$inferSelect): AuditRow => ({
  id: a.id,
  projectId: a.projectId,
  entityType: a.entityType,
  entityId: a.entityId,
  fromState: a.fromState,
  toState: a.toState,
  actorId: a.actorId,
  reason: a.reason,
  at: iso(a.at),
})

const toAssessmentRow = (a: typeof assessments.$inferSelect): AssessmentRow => ({
  id: a.id,
  projectId: a.projectId,
  source: a.source,
  verdict: a.verdict,
  signals: a.signals,
  similarProjects: a.similarProjects,
  createdAt: iso(a.createdAt),
})

// ---------- Người dùng ----------

export async function findUser(exec: Exec, id: string): Promise<UserRow | null> {
  const [row] = await exec.select().from(users).where(eq(users.id, id))
  return row ? toUserRow(row) : null
}

export async function findUserByEmail(exec: Exec, email: string): Promise<UserRow | null> {
  const [row] = await exec.select().from(users).where(eq(users.email, email))
  return row ? toUserRow(row) : null
}

export async function listUsers(exec: Exec): Promise<UserRow[]> {
  return (await exec.select().from(users).orderBy(asc(users.displayName))).map(toUserRow)
}

async function usersById(exec: Exec, ids: string[]): Promise<Map<string, UserRow>> {
  const unique = [...new Set(ids)]
  const rows = unique.length > 0 ? await exec.select().from(users).where(inArray(users.id, unique)) : []
  return new Map(rows.map((r) => [r.id, toUserRow(r)]))
}

// ---------- Dự án: đọc ----------

/** `lock: true` khoá dòng tới hết transaction, để hai request đổi trạng thái cùng lúc không đè lên nhau. */
export async function findProject(exec: Exec, id: string, opts: { lock?: boolean } = {}): Promise<ProjectRow | null> {
  const query = exec.select().from(projects).where(eq(projects.id, id))
  const [row] = opts.lock ? await query.for('update') : await query
  return row ? toProjectRow(row) : null
}

async function loadChildren(exec: Exec, projectIds: string[]) {
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

/** Hàng chờ xác minh — dự án chờ lâu nhất lên đầu. */
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

/** Dự án đang hoạt động, trừ `excludeId` — để so trùng tên khi gửi xác minh. */
export async function activeProjectNames(exec: Exec, excludeId: string): Promise<{ id: string; name: string }[]> {
  return exec
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(inArray(projects.status, ['pending_verification', 'published', 'in_progress']), ne(projects.id, excludeId)))
}

/** Đọc lại dự án đã lưu dưới dạng input, để kiểm lại quy tắc ngay trước khi gửi xác minh. */
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

// ---------- Dự án: ghi ----------

async function replaceNeeds(exec: Exec, projectId: string, items: ProjectInput['needItems']) {
  await exec.delete(needItems).where(eq(needItems.projectId, projectId))
  if (items.length === 0) return
  await exec
    .insert(needItems)
    .values(items.map((n, position) => ({ projectId, label: n.label, unit: n.unit, kind: n.kind, targetQty: n.targetQty, position })))
}

const projectContent = (input: ProjectInput) => ({
  name: input.name,
  goal: input.goal,
  beneficiaryGroup: input.beneficiaryGroup,
  location: input.location,
  startDate: input.startDate,
  endDate: input.endDate,
  treasurerId: input.treasurerId,
})

export async function insertProject(exec: Exec, input: ProjectInput, coordinatorId: string): Promise<string> {
  const [row] = await exec
    .insert(projects)
    .values({ ...projectContent(input), coordinatorId, status: 'draft' })
    .returning({ id: projects.id })
  await replaceNeeds(exec, row.id, input.needItems)
  return row.id
}

/** Chỉ gọi khi dự án còn là bản nháp — lúc đó chưa có đóng góp nào trỏ tới hạng mục nhu cầu cũ. */
export async function updateProjectContent(exec: Exec, id: string, input: ProjectInput) {
  await exec.update(projects).set({ ...projectContent(input), updatedAt: new Date() }).where(eq(projects.id, id))
  await replaceNeeds(exec, id, input.needItems)
}

export async function setProjectStatus(exec: Exec, id: string, status: ProjectStatus, rejectionReason: string | null) {
  await exec.update(projects).set({ status, rejectionReason, updatedAt: new Date() }).where(eq(projects.id, id))
}

export async function insertAssessment(exec: Exec, projectId: string, result: AssessmentResult) {
  await exec.insert(assessments).values({ projectId, source: 'rules', ...result })
}

export async function appendAudit(exec: Exec, entry: Omit<AuditRow, 'id' | 'at'>) {
  await exec.insert(auditLog).values(entry)
}

// ---------- Đóng góp ----------

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
