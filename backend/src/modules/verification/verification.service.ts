import { assessProject } from '@gomnang/shared/assess.ts'
import { canReviewProject, canSubmitProject } from '@gomnang/shared/rules.ts'
import type { ProjectDetail, QueueItem, ReviewInput, UserRow } from '@gomnang/shared/types.ts'
import { latestAssessment, toSummary, userRef } from '@gomnang/shared/views.ts'
import type { AppDeps } from '../../app.ts'
import { HttpError, ensure } from '../../common/errors.ts'
import { log } from '../../common/logger.ts'
import type { Db } from '../../db/client.ts'
import { appendAudit } from '../audit/audit.repository.ts'
import { contributionsForProjects } from '../contributions/contributions.repository.ts'
import { activeProjectNames, listPendingProjects, needsForProjects, setProjectStatus } from '../projects/projects.repository.ts'
import { checkProjectRules, detailById, findVisibleProject, loadProjectInput } from '../projects/projects.service.ts'
import { usersByIds } from '../users/users.repository.ts'
import { assessmentsForProjects, insertAssessment } from './verification.repository.ts'

/**
 * US-3: gửi dự án đi xác minh, người gác cổng đánh giá, người xác minh duyệt hoặc trả lại.
 * Người gác cổng chỉ ghi một bản đánh giá — nó không bao giờ tự đổi trạng thái dự án.
 */

type Deps = Pick<AppDeps, 'db' | 'today'>

/** Hàng chờ xác minh — dự án chờ lâu nhất lên đầu. */
export async function listQueue(db: Db, user: UserRow): Promise<QueueItem[]> {
  if (!user.isVerifier) {
    throw new HttpError(403, 'NOT_VERIFIER', 'Chỉ người xác minh mới xem được hàng chờ xác minh.')
  }

  const rows = await listPendingProjects(db)
  if (rows.length === 0) return []

  const ids = rows.map((p) => p.id)
  const needs = await needsForProjects(db, ids)
  const contributions = await contributionsForProjects(db, ids)
  const assessments = await assessmentsForProjects(db, ids)
  const users = await usersByIds(db, rows.map((p) => p.coordinatorId))

  return rows.map((p) => ({
    ...toSummary(p, needs, contributions),
    coordinator: userRef(users, p.coordinatorId),
    latestAssessment: latestAssessment(assessments, p.id),
  }))
}

export async function submitProject(deps: Deps, user: UserRow, id: string): Promise<ProjectDetail> {
  const verdict = await deps.db.transaction(async (tx) => {
    const project = await findVisibleProject(tx, id, user, { lock: true })
    ensure(canSubmitProject(project, user))

    // Kiểm lại quy tắc cứng trên dữ liệu đã lưu: ngày bắt đầu có thể đã trôi vào quá khứ kể từ lúc tạo.
    const input = await loadProjectInput(tx, project)
    await checkProjectRules(tx, deps.today(), input, project.coordinatorId)

    const assessment = assessProject(input, await activeProjectNames(tx, id))
    await insertAssessment(tx, id, assessment)
    await setProjectStatus(tx, id, 'pending_verification', null)
    await appendAudit(tx, {
      projectId: id,
      entityType: 'project',
      entityId: id,
      fromState: 'draft',
      toState: 'pending_verification',
      actorId: user.id,
      reason: null,
    })
    return assessment.verdict
  })

  log('info', 'project submitted', { projectId: id, userId: user.id, verdict })
  return detailById(deps.db, id)
}

export async function reviewProject(deps: Deps, user: UserRow, id: string, input: ReviewInput): Promise<ProjectDetail> {
  const status = await deps.db.transaction(async (tx) => {
    const project = await findVisibleProject(tx, id, user, { lock: true })
    ensure(canReviewProject(project, user, input))

    const next = input.decision === 'approve' ? 'published' : 'draft'
    const reason = input.reason?.trim() || null
    await setProjectStatus(tx, id, next, input.decision === 'reject' ? reason : null)
    await appendAudit(tx, {
      projectId: id,
      entityType: 'project',
      entityId: id,
      fromState: 'pending_verification',
      toState: next,
      actorId: user.id,
      reason,
    })
    return next
  })

  log('info', 'project reviewed', { projectId: id, userId: user.id, decision: input.decision, status })
  return detailById(deps.db, id)
}
