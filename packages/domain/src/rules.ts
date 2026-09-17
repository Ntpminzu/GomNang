import {
  ACCEPTING_STATUSES,
  PUBLIC_PROJECT_STATUSES,
  type ContributionRow,
  type NeedKind,
  type ProjectRow,
  type ReviewInput,
  type TransitionTarget,
} from './types.ts'

/**
 * Máy trạng thái và phân quyền của dự án và đóng góp.
 *
 * Mỗi hàm trả về `{ ok: true }` hoặc một lỗi có `kind` mang nghĩa nghiệp vụ.
 * Tầng HTTP đổi `kind` sang mã trạng thái (xem middleware xử lý lỗi trong `be/src/common`):
 *   forbidden → 403 · conflict → 409 · invalid → 422
 * Domain không biết gì về HTTP, nên mock của frontend dùng lại được y nguyên.
 */

export type Actor = { id: string; isVerifier: boolean }

export type RuleFailure = {
  ok: false
  kind: 'forbidden' | 'conflict' | 'invalid'
  code: string
  message: string
}
export type RuleResult = { ok: true } | RuleFailure

type ProjectRef = Pick<ProjectRow, 'status' | 'coordinatorId' | 'treasurerId'>

const OK: RuleResult = { ok: true }
const fail = (kind: RuleFailure['kind'], code: string, message: string): RuleFailure => ({
  ok: false,
  kind,
  code,
  message,
})

/** Người ngoài chỉ thấy dự án đã công khai. Bản nháp và dự án chờ xác minh bị ẩn như thể không tồn tại. */
export function canViewProject(project: ProjectRef, actor: Actor | null): boolean {
  if (PUBLIC_PROJECT_STATUSES.includes(project.status)) return true
  if (!actor) return false
  return actor.isVerifier || actor.id === project.coordinatorId || actor.id === project.treasurerId
}

export function canEditProject(project: ProjectRef, actor: Actor): RuleResult {
  if (actor.id !== project.coordinatorId)
    return fail('forbidden', 'NOT_COORDINATOR', 'Chỉ người điều phối của dự án mới được sửa dự án.')
  if (project.status !== 'draft')
    return fail('conflict', 'PROJECT_NOT_DRAFT', 'Chỉ sửa được dự án đang ở trạng thái Bản nháp.')
  return OK
}

export function canSubmitProject(project: ProjectRef, actor: Actor): RuleResult {
  if (actor.id !== project.coordinatorId)
    return fail('forbidden', 'NOT_COORDINATOR', 'Chỉ người điều phối của dự án mới được gửi dự án đi xác minh.')
  if (project.status !== 'draft')
    return fail('conflict', 'PROJECT_NOT_DRAFT', 'Chỉ gửi xác minh được dự án đang ở trạng thái Bản nháp.')
  return OK
}

export function canReviewProject(project: ProjectRef, actor: Actor, input: ReviewInput): RuleResult {
  if (!actor.isVerifier)
    return fail('forbidden', 'NOT_VERIFIER', 'Chỉ người xác minh mới được duyệt dự án.')
  if (actor.id === project.coordinatorId || actor.id === project.treasurerId)
    return fail(
      'forbidden',
      'CONFLICT_OF_INTEREST',
      'Người xác minh không được duyệt dự án mà chính mình là người điều phối hoặc phụ trách tài chính.',
    )
  if (project.status !== 'pending_verification')
    return fail('conflict', 'PROJECT_NOT_PENDING', 'Dự án không ở trạng thái Chờ xác minh.')
  if (input.decision === 'reject' && !input.reason?.trim())
    return fail('invalid', 'REASON_REQUIRED', 'Trả lại dự án thì bắt buộc ghi lý do để người điều phối biết cần sửa gì.')
  return OK
}

export function canCommit(
  project: ProjectRef,
  need: { targetQty: number; committedQty: number },
  quantity: number,
): RuleResult {
  if (!ACCEPTING_STATUSES.includes(project.status))
    return fail('conflict', 'PROJECT_NOT_ACCEPTING', 'Dự án chưa mở hoặc đã ngừng nhận đóng góp.')
  if (!Number.isInteger(quantity) || quantity <= 0)
    return fail('invalid', 'INVALID_QUANTITY', 'Số lượng cam kết phải là số nguyên lớn hơn 0.')

  const remaining = Math.max(0, need.targetQty - need.committedQty)
  if (quantity > remaining)
    return fail(
      'invalid',
      'EXCEEDS_REMAINING',
      remaining === 0
        ? 'Hạng mục này đã đủ cam kết.'
        : `Hạng mục này chỉ còn thiếu ${remaining}, không thể cam kết ${quantity}.`,
    )
  return OK
}

/**
 * Chuyển trạng thái đóng góp.
 *   committed → delivered : người đóng góp tự báo, hoặc người điều phối ghi nhận hộ
 *   delivered → confirmed : người khác xác nhận — không bao giờ là chính người đóng góp
 *
 * Với đóng góp bằng tiền, chỉ người điều phối được xác nhận. Người phụ trách tài chính là
 * người nhận tiền, nên để họ tự xác nhận khoản mình nhận là trái BR-003.
 */
export function canTransitionContribution(
  contribution: Pick<ContributionRow, 'status' | 'contributorId'>,
  to: TransitionTarget,
  project: ProjectRef,
  needKind: NeedKind,
  actor: Actor,
): RuleResult {
  if (!ACCEPTING_STATUSES.includes(project.status))
    return fail('conflict', 'PROJECT_NOT_ACCEPTING', 'Dự án không còn ở giai đoạn nhận đóng góp.')

  const isCoordinator = actor.id === project.coordinatorId
  const isTreasurer = actor.id === project.treasurerId
  const isContributor = actor.id === contribution.contributorId

  if (contribution.status === 'committed' && to === 'delivered') {
    if (!isContributor && !isCoordinator)
      return fail('forbidden', 'NOT_ALLOWED', 'Chỉ người đóng góp hoặc người điều phối mới đánh dấu đã bàn giao.')
    return OK
  }

  if (contribution.status === 'delivered' && to === 'confirmed') {
    if (isContributor)
      return fail('forbidden', 'SELF_CONFIRMATION', 'Người đóng góp không được tự xác nhận đóng góp của chính mình.')
    if (needKind === 'money' && !isCoordinator)
      return fail(
        'forbidden',
        'MONEY_NEEDS_COORDINATOR',
        'BR-003: đóng góp bằng tiền phải do người điều phối xác nhận, không phải người giữ tiền.',
      )
    if (!isCoordinator && !isTreasurer)
      return fail('forbidden', 'NOT_ALLOWED', 'Chỉ người điều phối hoặc người phụ trách tài chính mới xác nhận đóng góp.')
    return OK
  }

  return fail('conflict', 'INVALID_TRANSITION', `Không thể chuyển đóng góp từ "${contribution.status}" sang "${to}".`)
}

/** Những bước chuyển mà `actor` được làm với đóng góp này — giao diện dùng để quyết định hiện nút nào. */
export function allowedTransitions(
  contribution: Pick<ContributionRow, 'status' | 'contributorId'>,
  project: ProjectRef,
  needKind: NeedKind,
  actor: Actor | null,
): TransitionTarget[] {
  if (!actor) return []
  return (['delivered', 'confirmed'] as const).filter(
    (to) => canTransitionContribution(contribution, to, project, needKind, actor).ok,
  )
}
