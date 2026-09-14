import { canEditProject, canViewProject } from '@gomnang/shared/rules.ts'
import {
  PUBLIC_PROJECT_STATUSES,
  type ProjectDetail,
  type ProjectInput,
  type ProjectRow,
  type ProjectSummary,
  type UserRow,
} from '@gomnang/shared/types.ts'
import { validateProject } from '@gomnang/shared/validate-project.ts'
import { toDetail, toSummary } from '@gomnang/shared/views.ts'
import type { AppDeps } from '../../app.ts'
import { HttpError, ensure } from '../../common/errors.ts'
import { log } from '../../common/logger.ts'
import type { Db, Exec } from '../../db/client.ts'
import { appendAudit, auditForProject } from '../audit/audit.repository.ts'
import { contributionsForProjects } from '../contributions/contributions.repository.ts'
import { findUser, usersByIds } from '../users/users.repository.ts'
import { assessmentsForProjects } from '../verification/verification.repository.ts'
import * as repo from './projects.repository.ts'

/**
 * US-1: tạo và sửa dự án, cùng các hàm đọc dự án mà module khác dùng lại.
 * Mỗi thao tác ghi đi đúng ba bước: hỏi shared/ xem có được phép không → ghi trong một transaction
 * → thêm một dòng sổ ghi vết nếu có đổi trạng thái.
 */

type Deps = Pick<AppDeps, 'db' | 'today'>

export const projectNotFound = () => new HttpError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.')

// ---------- Đọc ----------

/** Không có quyền xem thì báo không tồn tại (404 chứ không phải 403) — không để lộ là dự án có thật. */
export async function findVisibleProject(
  exec: Exec,
  id: string,
  user: UserRow | null,
  opts: { lock?: boolean } = {},
): Promise<ProjectRow> {
  const project = await repo.findProject(exec, id, opts)
  if (!project || !canViewProject(project, user)) throw projectNotFound()
  return project
}

/** Ghép dự án với hạng mục, đóng góp, sổ ghi vết, đánh giá và tên người thành đúng hình dạng API trả về. */
export async function detailById(exec: Exec, id: string): Promise<ProjectDetail> {
  const project = await repo.findProject(exec, id)
  if (!project) throw projectNotFound()

  const needs = await repo.needsForProjects(exec, [id])
  const contributions = await contributionsForProjects(exec, [id])
  const audit = await auditForProject(exec, id)
  const assessments = await assessmentsForProjects(exec, [id])
  const users = await usersByIds(exec, [
    project.coordinatorId,
    ...(project.treasurerId ? [project.treasurerId] : []),
    ...contributions.map((c) => c.contributorId),
    ...audit.map((a) => a.actorId),
  ])

  return toDetail({ project, needs, contributions, audit, assessments, users })
}

export async function getProjectDetail(db: Db, id: string, user: UserRow | null): Promise<ProjectDetail> {
  await findVisibleProject(db, id, user)
  return detailById(db, id)
}

export async function listPublicProjects(db: Db): Promise<ProjectSummary[]> {
  const rows = await repo.listProjectsByStatus(db, PUBLIC_PROJECT_STATUSES)
  const ids = rows.map((p) => p.id)
  const needs = await repo.needsForProjects(db, ids)
  const contributions = await contributionsForProjects(db, ids)
  return rows.map((p) => toSummary(p, needs, contributions))
}

/** Đọc lại dự án đã lưu dưới dạng input, để kiểm lại quy tắc ngay trước khi gửi xác minh. */
export async function loadProjectInput(exec: Exec, project: ProjectRow): Promise<ProjectInput> {
  const needs = (await repo.needsForProjects(exec, [project.id])).sort((a, b) => a.position - b.position)
  return {
    name: project.name,
    goal: project.goal,
    beneficiaryGroup: project.beneficiaryGroup,
    location: project.location,
    startDate: project.startDate,
    endDate: project.endDate,
    treasurerId: project.treasurerId,
    needItems: needs.map((n) => ({ label: n.label, unit: n.unit, kind: n.kind, targetQty: n.targetQty })),
  }
}

// ---------- Quy tắc ----------

/** Kiểm quy tắc US-1 bằng đúng hàm mà form trên trình duyệt đang dùng. */
export async function checkProjectRules(exec: Exec, today: string, input: ProjectInput, coordinatorId: string) {
  const treasurer = input.treasurerId ? await findUser(exec, input.treasurerId) : null
  const errors = validateProject(input, {
    today,
    coordinatorId,
    treasurerVerified: input.treasurerId ? treasurer?.verified === true : undefined,
  })
  if (Object.keys(errors).length > 0) {
    throw new HttpError(422, 'VALIDATION_FAILED', 'Dữ liệu dự án chưa hợp lệ.', errors)
  }
}

// ---------- Ghi ----------

export async function createProject(deps: Deps, user: UserRow, input: ProjectInput): Promise<ProjectDetail> {
  const id = await deps.db.transaction(async (tx) => {
    // Người điều phối luôn là người đang đăng nhập — không bao giờ lấy từ body do client gửi.
    await checkProjectRules(tx, deps.today(), input, user.id)
    const projectId = await repo.insertProject(tx, input, user.id)
    await appendAudit(tx, {
      projectId,
      entityType: 'project',
      entityId: projectId,
      fromState: null,
      toState: 'draft',
      actorId: user.id,
      reason: null,
    })
    return projectId
  })

  log('info', 'project created', { projectId: id, userId: user.id })
  return detailById(deps.db, id)
}

export async function updateProject(deps: Deps, user: UserRow, id: string, input: ProjectInput): Promise<ProjectDetail> {
  await deps.db.transaction(async (tx) => {
    const project = await findVisibleProject(tx, id, user, { lock: true })
    ensure(canEditProject(project, user))
    await checkProjectRules(tx, deps.today(), input, project.coordinatorId)
    await repo.updateProjectContent(tx, id, input)
  })
  return detailById(deps.db, id)
}
