import { Router } from 'express'
import { z } from 'zod'
import { assessProject } from '@gomnang/domain/assess.ts'
import {
  canCommit,
  canEditProject,
  canReviewProject,
  canSubmitProject,
  canTransitionContribution,
  canViewProject,
} from '@gomnang/domain/rules.ts'
import { NEED_KINDS, PUBLIC_PROJECT_STATUSES, type ProjectInput } from '@gomnang/domain/types.ts'
import { validateProject } from '@gomnang/domain/validate-project.ts'
import type { AppDeps } from './app.ts'
import { currentUser, maybeUser, optionalAuth, requireAuth } from './auth.ts'
import type { Exec } from './db/client.ts'
import * as repo from './db/repo.ts'
import { HttpError, ensure, log, parseBody } from './http.ts'

/**
 * Endpoint của dự án và đóng góp. Mỗi handler đi đúng ba bước:
 *   1. Đọc và kiểm định dạng request (zod → 400)
 *   2. Hỏi packages/domain xem thao tác có được phép không (→ 403 / 409 / 422)
 *   3. Ghi qua db/repo.ts trong một transaction, kèm một dòng sổ ghi vết nếu có đổi trạng thái
 * Handler không tự viết quy tắc nghiệp vụ nào.
 */

// ---------- Định dạng request ----------

const MAX_QUANTITY = 10_000_000
const str = (max: number) => z.string().trim().max(max)

const projectBody = z.object({
  name: str(150),
  goal: str(2000),
  beneficiaryGroup: str(200),
  location: str(300),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  treasurerId: z
    .uuid()
    .nullish()
    .transform((v) => v ?? null),
  needItems: z
    .array(z.object({ label: str(100), unit: str(30), kind: z.enum(NEED_KINDS), targetQty: z.number().max(MAX_QUANTITY) }))
    .max(30),
})

const reviewBody = z.object({ decision: z.enum(['approve', 'reject']), reason: str(1000).optional() })
const commitBody = z.object({ needItemId: z.uuid(), quantity: z.number().max(MAX_QUANTITY) })
const transitionBody = z.object({ to: z.enum(['delivered', 'confirmed']) })

// ---------- Tiện ích ----------

const projectNotFound = () => new HttpError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.')
const contributionNotFound = () => new HttpError(404, 'CONTRIBUTION_NOT_FOUND', 'Không tìm thấy đóng góp.')

/**
 * Mã sai định dạng thì coi như không tồn tại, thay vì để PostgreSQL báo lỗi cú pháp uuid thành 500.
 * Nhận `unknown` vì Express 5 khai báo tham số đường dẫn có thể là mảng.
 */
function idParam(value: unknown, notFound: () => HttpError): string {
  const parsed = z.uuid().safeParse(value)
  if (!parsed.success) throw notFound()
  return parsed.data
}

/** Kiểm quy tắc US-1 bằng đúng hàm mà form trên trình duyệt đang dùng. */
async function checkProjectRules(exec: Exec, today: string, input: ProjectInput, coordinatorId: string) {
  const treasurer = input.treasurerId ? await repo.findUser(exec, input.treasurerId) : null
  const errors = validateProject(input, {
    today,
    coordinatorId,
    treasurerVerified: input.treasurerId ? treasurer?.verified === true : undefined,
  })
  if (Object.keys(errors).length > 0) {
    throw new HttpError(422, 'VALIDATION_FAILED', 'Dữ liệu dự án chưa hợp lệ.', errors)
  }
}

export function projectRoutes(deps: AppDeps): Router {
  const router = Router()
  const auth = requireAuth(deps)
  const guestOrUser = optionalAuth(deps)
  const { db } = deps

  // ---------- Đọc ----------

  router.get('/api/projects', async (_req, res) => {
    res.json(await repo.listSummaries(db, PUBLIC_PROJECT_STATUSES))
  })

  router.get('/api/projects/:id', guestOrUser, async (req, res) => {
    const id = idParam(req.params.id, projectNotFound)
    const project = await repo.findProject(db, id)
    // Không có quyền xem thì trả 404 chứ không phải 403: không để lộ là dự án có tồn tại.
    if (!project || !canViewProject(project, maybeUser(res))) throw projectNotFound()
    res.json(await repo.loadDetail(db, id))
  })

  router.get('/api/verification-queue', auth, async (_req, res) => {
    if (!currentUser(res).isVerifier) {
      throw new HttpError(403, 'NOT_VERIFIER', 'Chỉ người xác minh mới xem được hàng chờ xác minh.')
    }
    res.json(await repo.listQueue(db))
  })

  // ---------- US-1: tạo và sửa bản nháp ----------

  router.post('/api/projects', auth, async (req, res) => {
    const user = currentUser(res)
    const input = parseBody(projectBody, req.body)

    const id = await db.transaction(async (tx) => {
      // Người điều phối luôn là người đang đăng nhập — không bao giờ lấy từ body do client gửi.
      await checkProjectRules(tx, deps.today(), input, user.id)
      const projectId = await repo.insertProject(tx, input, user.id)
      await repo.appendAudit(tx, {
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
    res.status(201).location(`/api/projects/${id}`).json(await repo.loadDetail(db, id))
  })

  router.put('/api/projects/:id', auth, async (req, res) => {
    const user = currentUser(res)
    const id = idParam(req.params.id, projectNotFound)
    const input = parseBody(projectBody, req.body)

    await db.transaction(async (tx) => {
      const project = await repo.findProject(tx, id, { lock: true })
      if (!project || !canViewProject(project, user)) throw projectNotFound()
      ensure(canEditProject(project, user))
      await checkProjectRules(tx, deps.today(), input, project.coordinatorId)
      await repo.updateProjectContent(tx, id, input)
    })

    res.json(await repo.loadDetail(db, id))
  })

  // ---------- US-3: gửi xác minh và duyệt ----------

  router.post('/api/projects/:id/submit', auth, async (req, res) => {
    const user = currentUser(res)
    const id = idParam(req.params.id, projectNotFound)

    const verdict = await db.transaction(async (tx) => {
      const project = await repo.findProject(tx, id, { lock: true })
      if (!project || !canViewProject(project, user)) throw projectNotFound()
      ensure(canSubmitProject(project, user))

      // Kiểm lại quy tắc cứng trên dữ liệu đã lưu: ngày bắt đầu có thể đã trôi vào quá khứ kể từ lúc tạo.
      const input = await repo.loadProjectInput(tx, project)
      await checkProjectRules(tx, deps.today(), input, project.coordinatorId)

      const assessment = assessProject(input, await repo.activeProjectNames(tx, id))
      await repo.insertAssessment(tx, id, assessment)
      await repo.setProjectStatus(tx, id, 'pending_verification', null)
      await repo.appendAudit(tx, {
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
    res.json(await repo.loadDetail(db, id))
  })

  router.post('/api/projects/:id/review', auth, async (req, res) => {
    const user = currentUser(res)
    const id = idParam(req.params.id, projectNotFound)
    const input = parseBody(reviewBody, req.body)

    const to = await db.transaction(async (tx) => {
      const project = await repo.findProject(tx, id, { lock: true })
      if (!project || !canViewProject(project, user)) throw projectNotFound()
      ensure(canReviewProject(project, user, input))

      const next = input.decision === 'approve' ? 'published' : 'draft'
      const reason = input.reason?.trim() || null
      await repo.setProjectStatus(tx, id, next, input.decision === 'reject' ? reason : null)
      await repo.appendAudit(tx, {
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
    res.json(await repo.loadDetail(db, id))
  })

  // ---------- US-2: cam kết và xác nhận đóng góp ----------

  router.post('/api/projects/:id/contributions', auth, async (req, res) => {
    const user = currentUser(res)
    const id = idParam(req.params.id, projectNotFound)
    const input = parseBody(commitBody, req.body)

    const contributionId = await db.transaction(async (tx) => {
      const project = await repo.findProject(tx, id)
      if (!project || !canViewProject(project, user)) throw projectNotFound()

      const locked = await repo.lockNeedWithTotals(tx, input.needItemId)
      if (!locked || locked.need.projectId !== id) {
        throw new HttpError(404, 'NEED_NOT_FOUND', 'Không tìm thấy hạng mục nhu cầu này trong dự án.')
      }
      ensure(canCommit(project, locked.totals, input.quantity))

      const newId = await repo.insertContribution(tx, {
        projectId: id,
        needItemId: input.needItemId,
        contributorId: user.id,
        quantity: input.quantity,
      })
      await repo.appendAudit(tx, {
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
    const detail = await repo.loadDetail(db, id)
    res.status(201).json(detail?.contributions.find((c) => c.id === contributionId))
  })

  router.post('/api/contributions/:id/transition', auth, async (req, res) => {
    const user = currentUser(res)
    const id = idParam(req.params.id, contributionNotFound)
    const { to } = parseBody(transitionBody, req.body)

    const projectId = await db.transaction(async (tx) => {
      const contribution = await repo.findContribution(tx, id, { lock: true })
      if (!contribution) throw contributionNotFound()
      const project = await repo.findProject(tx, contribution.projectId)
      const need = await repo.findNeed(tx, contribution.needItemId)
      if (!project || !need) throw contributionNotFound()

      ensure(canTransitionContribution(contribution, to, project, need.kind, user))
      await repo.setContributionStatus(tx, id, to)
      await repo.appendAudit(tx, {
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
    const detail = await repo.loadDetail(db, projectId)
    res.json(detail?.contributions.find((c) => c.id === id))
  })

  return router
}
