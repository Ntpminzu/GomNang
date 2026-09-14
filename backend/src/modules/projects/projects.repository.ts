import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm'
import type { NeedRow, ProjectInput, ProjectRow, ProjectStatus } from '@gomnang/shared/types.ts'
import type { Exec } from '../../db/client.ts'
import { needItems, projects } from '../../db/schema.ts'

// Truy vấn bảng projects và need_items. Không có quy tắc nghiệp vụ nào ở đây — quy tắc nằm ở shared/,
// còn việc ghép nhiều bảng lại với nhau nằm ở projects.service.ts.

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
  createdAt: p.createdAt.toISOString(),
})

export const toNeedRow = (n: typeof needItems.$inferSelect): NeedRow => ({
  id: n.id,
  projectId: n.projectId,
  label: n.label,
  unit: n.unit,
  kind: n.kind,
  targetQty: n.targetQty,
  position: n.position,
})

// ---------- Đọc ----------

/** `lock: true` khoá dòng tới hết transaction, để hai request đổi trạng thái cùng lúc không đè lên nhau. */
export async function findProject(exec: Exec, id: string, opts: { lock?: boolean } = {}): Promise<ProjectRow | null> {
  const query = exec.select().from(projects).where(eq(projects.id, id))
  const [row] = opts.lock ? await query.for('update') : await query
  return row ? toProjectRow(row) : null
}

/** Dự án theo trạng thái, mới tạo nằm trên. */
export async function listProjectsByStatus(exec: Exec, statuses: readonly ProjectStatus[]): Promise<ProjectRow[]> {
  const rows = await exec
    .select()
    .from(projects)
    .where(inArray(projects.status, [...statuses]))
    .orderBy(desc(projects.createdAt))
  return rows.map(toProjectRow)
}

/** Dự án chờ xác minh, chờ lâu nhất nằm trên. */
export async function listPendingProjects(exec: Exec): Promise<ProjectRow[]> {
  const rows = await exec
    .select()
    .from(projects)
    .where(eq(projects.status, 'pending_verification'))
    .orderBy(asc(projects.updatedAt))
  return rows.map(toProjectRow)
}

export async function needsForProjects(exec: Exec, projectIds: string[]): Promise<NeedRow[]> {
  if (projectIds.length === 0) return []
  return (await exec.select().from(needItems).where(inArray(needItems.projectId, projectIds))).map(toNeedRow)
}

/** Dự án đang hoạt động, trừ `excludeId` — để so trùng tên khi gửi xác minh. */
export async function activeProjectNames(exec: Exec, excludeId: string): Promise<{ id: string; name: string }[]> {
  return exec
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(inArray(projects.status, ['pending_verification', 'published', 'in_progress']), ne(projects.id, excludeId)))
}

// ---------- Ghi ----------

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
