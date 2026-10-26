import { RELEASED_BY_CANCEL, canCancelProject, canCompleteProject, canDeleteProject, canEditProject, canStartProject, canViewProject, type RuleResult } from '@gomnang/domain/rules.ts'
import {
  PUBLIC_PROJECT_STATUSES,
  type CancelInput,
  type CompleteInput,
  type ContributionRow,
  type ExpenseRow,
  type ProjectInput,
  type ProjectRow,
  type ProjectStatus,
  type UserRow,
} from '@gomnang/domain/types.ts'
import { queryProjects, type ProjectListQuery } from '@gomnang/domain/catalog.ts'
import { HttpError, ensure } from '../../common/errors/http-error.ts'
import { log } from '../../infrastructure/logging/logger.ts'
import type { ProjectsDeps } from './projects.types.ts'
export const projectNotFound = () => new HttpError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.')
const contributionNotFound = () => new HttpError(404, 'CONTRIBUTION_NOT_FOUND', 'Không tìm thấy đóng góp.')
import { checkProjectRules } from '../projects/projects.validation.ts'

export async function listProjects(deps: ProjectsDeps, query: ProjectListQuery) {
  return queryProjects(await deps.projects.listSummaries(deps.db, PUBLIC_PROJECT_STATUSES), query, deps.today())
}

export async function getProject(deps: ProjectsDeps, id: string, user: UserRow | null) {
  const { db } = deps
    const project = await deps.projects.findProject(db, id)
    // Không có quyền xem thì trả 404 chứ không phải 403: không để lộ là dự án có tồn tại.
    if (!project || !canViewProject(project, user)) throw projectNotFound()
    return (await deps.projects.loadDetail(db, id))
}

export async function createProject(deps: ProjectsDeps, input: ProjectInput, user: UserRow) {
  const { db } = deps

    const id = await db.transaction(async (tx) => {
      // Người điều phối luôn là người đang đăng nhập — không bao giờ lấy từ body do client gửi.
      await checkProjectRules(tx, deps.today(), input, user.id, deps.users.findUser)
      const projectId = await deps.projects.insertProject(tx, input, user.id)
      await deps.audit.appendAudit(tx, {
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
    return (await deps.projects.loadDetail(db, id))
}

export async function updateProject(deps: ProjectsDeps, id: string, input: ProjectInput, user: UserRow) {
  const { db } = deps

    await db.transaction(async (tx) => {
      const project = await deps.projects.findProject(tx, id, { lock: true })
      if (!project || !canViewProject(project, user)) throw projectNotFound()
      ensure(canEditProject(project, user))
      await checkProjectRules(tx, deps.today(), input, project.coordinatorId, deps.users.findUser)
      await deps.projects.updateProjectContent(tx, id, input)
    })

    return (await deps.projects.loadDetail(db, id))
}

/** Xoá mềm bản nháp kèm một dòng sổ ghi vết, cùng transaction. Sau đó mọi đường đọc trả 404. */
export async function deleteProject(deps: ProjectsDeps, id: string, user: UserRow) {
  await deps.db.transaction(async (tx) => {
    const project = await deps.projects.findProject(tx, id, { lock: true })
    if (!project || !canViewProject(project, user)) throw projectNotFound()
    ensure(canDeleteProject(project, user))
    await deps.projects.softDeleteProject(tx, id)
    await deps.audit.appendAudit(tx, {
      projectId: id,
      entityType: 'project',
      entityId: id,
      fromState: project.status,
      toState: 'deleted',
      actorId: user.id,
      reason: null,
    })
  })
  log('info', 'project deleted', { projectId: id, userId: user.id })
}

/**
 * Đổi trạng thái dự án sau khi hỏi quy tắc trong packages/domain, kèm một dòng sổ ghi vết — cùng một transaction.
 * Khoá dòng dự án (FOR UPDATE) để hai người bấm cùng lúc không ghi đè nhau.
 */
async function changeStatus(
  deps: ProjectsDeps,
  id: string,
  user: UserRow,
  to: ProjectStatus,
  check: (project: ProjectRow, contributions: ContributionRow[], expenses: ExpenseRow[]) => RuleResult,
  extra: { reason?: string; report?: string } = {},
) {
  await deps.db.transaction(async (tx) => {
    const project = await deps.projects.findProject(tx, id, { lock: true })
    if (!project || !canViewProject(project, user)) throw projectNotFound()
    const { contributions } = await deps.projects.loadChildren(tx, [id])
    ensure(check(project, contributions, await deps.projects.listExpenses(tx, id)))
    await deps.projects.setProjectStatus(tx, id, to, null)
    if (extra.report !== undefined) await deps.projects.setProjectReport(tx, id, extra.report)
    await deps.audit.appendAudit(tx, {
      projectId: id,
      entityType: 'project',
      entityId: id,
      fromState: project.status,
      toState: to,
      actorId: user.id,
      reason: extra.reason ?? null,
    })
    if (to === 'cancelled') {
      for (const contributionId of await deps.projects.releaseCommitments(tx, id)) {
        await deps.audit.appendAudit(tx, {
          projectId: id,
          entityType: 'contribution',
          entityId: contributionId,
          fromState: 'committed',
          toState: 'cancelled',
          actorId: user.id,
          reason: RELEASED_BY_CANCEL,
        })
      }
    }
  })
  deps.events?.publish(id)
  log('info', 'project status changed', { projectId: id, userId: user.id, to })
  return deps.projects.loadDetail(deps.db, id)
}

export const startProject = (deps: ProjectsDeps, id: string, user: UserRow) =>
  changeStatus(deps, id, user, 'in_progress', (project) => canStartProject(project, user))

export const completeProject = (deps: ProjectsDeps, id: string, input: CompleteInput, user: UserRow) =>
  changeStatus(
    deps,
    id,
    user,
    'completed',
    (project, contributions, expenses) =>
      canCompleteProject(project, user, input, contributions, expenses.filter((e) => e.status === 'pending').length),
    {
    report: input.report.trim(),
  })

export const cancelProject = (deps: ProjectsDeps, id: string, input: CancelInput, user: UserRow) =>
  changeStatus(deps, id, user, 'cancelled', (project) => canCancelProject(project, user, input), { reason: input.reason.trim() })
