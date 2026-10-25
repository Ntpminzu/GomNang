import { assessProject, mergeAiAssessment } from '@gomnang/domain/assess.ts'
import { canCommit, canEditProject, canRequestAiAssessment, canReviewProject, canSubmitProject, canTransitionContribution, canViewProject } from '@gomnang/domain/rules.ts'
import { PUBLIC_PROJECT_STATUSES, type ProjectInput, type UserRow, type ReviewInput, type CommitInput, type TransitionTarget } from '@gomnang/domain/types.ts'
import { validateProject } from '@gomnang/domain/validate-project.ts'
import type { Exec } from '../../infrastructure/database/client.ts'
import { HttpError, ensure } from '../../common/errors/http-error.ts'
import { log } from '../../infrastructure/logging/logger.ts'
import type { VerificationDeps } from './verification.types.ts'
import { runAiAssessment } from './verification.ai.ts'
import type { AiAssessmentInput } from './verification.schema.ts'
export const projectNotFound = () => new HttpError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.')
const contributionNotFound = () => new HttpError(404, 'CONTRIBUTION_NOT_FOUND', 'Không tìm thấy đóng góp.')
import { checkProjectRules } from '../projects/projects.validation.ts'

export async function getQueue(deps: VerificationDeps, user: UserRow) {
  const { db } = deps
    if (user.role !== 'verifier') {
      throw new HttpError(403, 'NOT_VERIFIER', 'Chỉ người xác minh mới xem được hàng chờ xác minh.')
    }
    return (await deps.verification.listQueue(db))
}

export async function submitProject(deps: VerificationDeps, id: string, user: UserRow) {
  const { db } = deps

    const verdict = await db.transaction(async (tx) => {
      const project = await deps.projects.findProject(tx, id, { lock: true })
      if (!project || !canViewProject(project, user)) throw projectNotFound()
      ensure(canSubmitProject(project, user))

      // Kiểm lại quy tắc cứng trên dữ liệu đã lưu: ngày bắt đầu có thể đã trôi vào quá khứ kể từ lúc tạo.
      const input = await deps.projects.loadProjectInput(tx, project)
      await checkProjectRules(tx, deps.today(), input, project.coordinatorId, deps.users.findUser)

      const assessment = assessProject(input, await deps.projects.activeProjectNames(tx, id))
      await deps.verification.insertAssessment(tx, id, assessment)
      await deps.projects.setProjectStatus(tx, id, 'pending_verification', null)
      await deps.audit.appendAudit(tx, {
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
    return (await deps.projects.loadDetail(db, id))
}

export async function reviewProject(deps: VerificationDeps, id: string, input: ReviewInput, user: UserRow) {
  const { db } = deps

    const to = await db.transaction(async (tx) => {
      const project = await deps.projects.findProject(tx, id, { lock: true })
      if (!project || !canViewProject(project, user)) throw projectNotFound()
      ensure(canReviewProject(project, user, input))

      const next = input.decision === 'approve' ? 'published' : 'draft'
      const reason = input.reason?.trim() || null
      await deps.projects.setProjectStatus(tx, id, next, input.decision === 'reject' ? reason : null)
      await deps.audit.appendAudit(tx, {
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

    log('info', 'project reviewed', { projectId: id, userId: user.id, decision: input.decision, status: to })
    return (await deps.projects.loadDetail(db, id))
}

/**
 * Năng lực AI thứ hai — structured output: AI đọc hồ sơ, trả JSON đúng schema, app gộp với kết quả quy tắc
 * (AI chỉ nâng được mức cảnh báo) rồi lưu thành đánh giá mới để người xác minh đọc. AI không đổi trạng thái dự án.
 */
export async function requestAiAssessment(deps: VerificationDeps, id: string, input: AiAssessmentInput, user: UserRow) {
  const { db } = deps
  const project = await deps.projects.findProject(db, id)
  if (!project || !canViewProject(project, user)) throw projectNotFound()
  ensure(canRequestAiAssessment(project, user))

  const { name, client } = deps.chatModels[input.model]
  if (!client) throw new HttpError(503, 'AI_MODEL_UNAVAILABLE', 'Model này chưa được cấu hình trên máy chủ. Kết quả kiểm theo quy tắc vẫn dùng được.')

  const projectInput = await deps.projects.loadProjectInput(db, project)
  const rules = assessProject(projectInput, await deps.projects.activeProjectNames(db, id))
  // Gọi model NGOÀI transaction: có thể mất cả phút, không giữ khoá dòng trong lúc chờ.
  const run = await runAiAssessment(client, projectInput, rules, { provider: input.model, modelName: name })
  const merged = mergeAiAssessment(rules, run.result)

  await db.transaction(async (tx) => {
    // Trong lúc chờ AI, dự án có thể đã được duyệt hoặc trả lại: kiểm lại trước khi ghi.
    const current = await deps.projects.findProject(tx, id, { lock: true })
    if (!current) throw projectNotFound()
    ensure(canRequestAiAssessment(current, user))
    await deps.verification.insertAssessment(tx, id, merged, 'ai')
  })
  log('info', 'ai assessment saved', { projectId: id, userId: user.id, verdict: merged.verdict, attempts: run.attempts })
  return deps.projects.loadDetail(db, id)
}
