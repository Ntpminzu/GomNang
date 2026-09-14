import { canCommit, canTransitionContribution } from '@gomnang/shared/rules.ts'
import type { CommitInput, Contribution, TransitionTarget, UserRow } from '@gomnang/shared/types.ts'
import type { AppDeps } from '../../app.ts'
import { HttpError, ensure } from '../../common/errors.ts'
import { log } from '../../common/logger.ts'
import type { Exec } from '../../db/client.ts'
import { appendAudit } from '../audit/audit.repository.ts'
import { findProject } from '../projects/projects.repository.ts'
import { detailById, findVisibleProject } from '../projects/projects.service.ts'
import * as repo from './contributions.repository.ts'

/** US-2: cam kết đóng góp một phần cụ thể, rồi bàn giao và xác nhận theo chuỗi trạng thái trong shared/rules.ts. */

type Deps = Pick<AppDeps, 'db'>

export const contributionNotFound = () => new HttpError(404, 'CONTRIBUTION_NOT_FOUND', 'Không tìm thấy đóng góp.')

/** Đọc lại đóng góp ở đúng hình dạng API trả về, kèm tên người và hạng mục. */
async function contributionView(exec: Exec, projectId: string, contributionId: string): Promise<Contribution> {
  const found = (await detailById(exec, projectId)).contributions.find((c) => c.id === contributionId)
  if (!found) throw contributionNotFound()
  return found
}

export async function commitContribution(
  deps: Deps,
  user: UserRow,
  projectId: string,
  input: CommitInput,
): Promise<Contribution> {
  const contributionId = await deps.db.transaction(async (tx) => {
    const project = await findVisibleProject(tx, projectId, user)

    const locked = await repo.lockNeedWithTotals(tx, input.needItemId)
    if (!locked || locked.need.projectId !== projectId) {
      throw new HttpError(404, 'NEED_NOT_FOUND', 'Không tìm thấy hạng mục nhu cầu này trong dự án.')
    }
    ensure(canCommit(project, locked.totals, input.quantity))

    const newId = await repo.insertContribution(tx, {
      projectId,
      needItemId: input.needItemId,
      contributorId: user.id,
      quantity: input.quantity,
    })
    await appendAudit(tx, {
      projectId,
      entityType: 'contribution',
      entityId: newId,
      fromState: null,
      toState: 'committed',
      actorId: user.id,
      reason: null,
    })
    return newId
  })

  log('info', 'contribution committed', { projectId, contributionId, userId: user.id, quantity: input.quantity })
  return contributionView(deps.db, projectId, contributionId)
}

export async function transitionContribution(
  deps: Deps,
  user: UserRow,
  id: string,
  to: TransitionTarget,
): Promise<Contribution> {
  const projectId = await deps.db.transaction(async (tx) => {
    const contribution = await repo.findContribution(tx, id, { lock: true })
    if (!contribution) throw contributionNotFound()
    const project = await findProject(tx, contribution.projectId)
    const need = await repo.findNeed(tx, contribution.needItemId)
    if (!project || !need) throw contributionNotFound()

    ensure(canTransitionContribution(contribution, to, project, need.kind, user))
    await repo.setContributionStatus(tx, id, to)
    await appendAudit(tx, {
      projectId: project.id,
      entityType: 'contribution',
      entityId: id,
      fromState: contribution.status,
      toState: to,
      actorId: user.id,
      reason: null,
    })
    return project.id
  })

  log('info', 'contribution transitioned', { contributionId: id, userId: user.id, to })
  return contributionView(deps.db, projectId, id)
}
