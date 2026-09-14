import { assessProject } from '@gomnang/domain/assess.ts'
import { canCommit, canEditProject, canReviewProject, canSubmitProject, canTransitionContribution, canViewProject } from '@gomnang/domain/rules.ts'
import { PUBLIC_PROJECT_STATUSES, type ProjectInput, type UserRow, type ReviewInput, type CommitInput, type TransitionTarget } from '@gomnang/domain/types.ts'
import { validateProject } from '@gomnang/domain/validate-project.ts'
import type { Exec } from '../../infrastructure/database/client.ts'
import { HttpError, ensure } from '../../common/errors/http-error.ts'
import { log } from '../../infrastructure/logging/logger.ts'
import type { ProjectsDeps } from './projects.types.ts'
export const projectNotFound = () => new HttpError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.')
const contributionNotFound = () => new HttpError(404, 'CONTRIBUTION_NOT_FOUND', 'Không tìm thấy đóng góp.')
import { checkProjectRules } from '../projects/projects.validation.ts'

export async function listProjects(deps: ProjectsDeps) {
  const { db } = deps
    return (await deps.projects.listSummaries(db, PUBLIC_PROJECT_STATUSES))
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
