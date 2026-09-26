import { canCommit, canTransitionContribution, canViewProject } from '@gomnang/domain/rules.ts'
import type { CommitInput, TransitionInput, UserRow } from '@gomnang/domain/types.ts'
import { HttpError, ensure } from '../../common/errors/http-error.ts'
import { log } from '../../infrastructure/logging/logger.ts'
import type { ContributionsDeps } from './contributions.types.ts'
export const projectNotFound = () => new HttpError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.')
const contributionNotFound = () => new HttpError(404, 'CONTRIBUTION_NOT_FOUND', 'Không tìm thấy đóng góp.')

export async function commitContribution(deps: ContributionsDeps, id: string, input: CommitInput, user: UserRow) {
  const { db } = deps

    const contributionId = await db.transaction(async (tx) => {
      const project = await deps.projects.findProject(tx, id)
      if (!project || !canViewProject(project, user)) throw projectNotFound()

      const locked = await deps.contributions.lockNeedWithTotals(tx, input.needItemId)
      if (!locked || locked.need.projectId !== id) {
        throw new HttpError(404, 'NEED_NOT_FOUND', 'Không tìm thấy hạng mục nhu cầu này trong dự án.')
      }
      ensure(canCommit(project, locked.totals, input.quantity))

      const newId = await deps.contributions.insertContribution(tx, {
        projectId: id,
        needItemId: input.needItemId,
        contributorId: user.id,
        quantity: input.quantity,
      })
      await deps.audit.appendAudit(tx, {
        projectId: id,
        entityType: 'contribution',
        entityId: newId,
        fromState: null,
        toState: 'committed',
        actorId: user.id,
        reason: null,
      })
      return newId
    })

    log('info', 'contribution committed', { projectId: id, contributionId, userId: user.id, quantity: input.quantity })
    const detail = await deps.projects.loadDetail(db, id)
    return (detail?.contributions.find((c) => c.id === contributionId))
}

export async function transitionContribution(deps: ContributionsDeps, id: string, input: TransitionInput, user: UserRow) {
  const { to } = input
  const { db } = deps

    const projectId = await db.transaction(async (tx) => {
      const contribution = await deps.contributions.findContribution(tx, id, { lock: true })
      if (!contribution) throw contributionNotFound()
      const project = await deps.projects.findProject(tx, contribution.projectId)
      const need = await deps.contributions.findNeed(tx, contribution.needItemId)
      if (!project || !need) throw contributionNotFound()

      ensure(canTransitionContribution(contribution, to, project, need.kind, user))
      await deps.contributions.setContributionStatus(tx, id, to)
      await deps.audit.appendAudit(tx, {
        projectId: project.id,
        entityType: 'contribution',
        entityId: id,
        fromState: contribution.status,
        toState: to,
        actorId: user.id,
        reason: input.note?.trim() || null,
      })
      return project.id
    })

    log('info', 'contribution transitioned', { contributionId: id, userId: user.id, to })
    const detail = await deps.projects.loadDetail(db, projectId)
    return (detail?.contributions.find((c) => c.id === id))
}
