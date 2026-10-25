import {
  ACCEPTING_STATUSES,
  PUBLIC_PROJECT_STATUSES,
  type CancelInput,
  type CompleteInput,
  type ExpenseInput,
  type ExpenseReviewInput,
  type ExpenseRow,
  type ContributionRow,
  type ContributionStatus,
  type NeedKind,
  type ProjectRow,
  type ReviewInput,
  type TransitionTarget,
  type UpdateInput,
} from './types.ts'
import type { LedgerLine } from './views.ts'

/**
 * Máy trạng thái và phân quyền của dự án và đóng góp.
 *
 * Mỗi hàm trả về `{ ok: true }` hoặc một lỗi có `kind` mang nghĩa nghiệp vụ.
 * Tầng HTTP đổi `kind` sang mã trạng thái (xem middleware xử lý lỗi trong `be/src/common`):
 *   forbidden → 403 · conflict → 409 · invalid → 422
 * Domain không biết gì về HTTP, nên mock của frontend dùng lại được y nguyên.
 */

export type Actor = { id: string; role: import('./types.ts').Role }

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
  return (actor.role === 'verifier') || actor.id === project.coordinatorId || actor.id === project.treasurerId
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
  if (actor.role !== 'verifier')
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

/** Nhờ AI đánh giá hồ sơ: cùng điều kiện với người được duyệt (người xác minh, không xung đột lợi ích, dự án đang chờ). */
export function canRequestAiAssessment(project: ProjectRef, actor: Actor): RuleResult {
  return canReviewProject(project, actor, { decision: 'approve' })
}

export const MIN_REPORT_LENGTH = 30
export const MIN_CANCEL_REASON_LENGTH = 10

/** Đang kêu gọi → Đang thực hiện. Người điều phối bấm khi hoạt động bắt đầu; vẫn nhận thêm đóng góp trong lúc thực hiện. */
export function canStartProject(project: ProjectRef, actor: Actor): RuleResult {
  if (actor.id !== project.coordinatorId)
    return fail('forbidden', 'NOT_COORDINATOR', 'Chỉ người điều phối mới chuyển dự án sang giai đoạn thực hiện.')
  if (project.status !== 'published')
    return fail('conflict', 'PROJECT_NOT_PUBLISHED', 'Chỉ bắt đầu thực hiện được dự án đang kêu gọi.')
  return OK
}

/**
 * Đang thực hiện → Đã hoàn thành, kèm báo cáo tổng kết (kiểu báo cáo cuối kỳ của GlobalGiving).
 * Chỉ chốt sổ khi mọi đóng góp đã có kết cục: đã xác nhận hoặc đã huỷ. Còn đóng góp treo thì báo rõ bao nhiêu.
 */
export function canCompleteProject(
  project: ProjectRef,
  actor: Actor,
  input: CompleteInput,
  contributions: readonly { status: ContributionStatus }[],
  pendingExpenses = 0,
): RuleResult {
  if (actor.id !== project.coordinatorId)
    return fail('forbidden', 'NOT_COORDINATOR', 'Chỉ người điều phối mới hoàn thành được dự án.')
  if (project.status !== 'in_progress')
    return fail('conflict', 'PROJECT_NOT_IN_PROGRESS', 'Chỉ hoàn thành được dự án đang thực hiện.')
  const open = contributions.filter((c) => c.status === 'committed' || c.status === 'delivered')
  if (open.length > 0) {
    const delivered = open.filter((c) => c.status === 'delivered').length
    return fail(
      'conflict',
      'OPEN_CONTRIBUTIONS',
      `Còn ${open.length} đóng góp chưa có kết cục (${delivered} chờ xác nhận, ${open.length - delivered} chưa bàn giao). ` +
        'Xác nhận hoặc huỷ hết trước khi chốt dự án.',
    )
  }
  if (pendingExpenses > 0)
    return fail('conflict', 'PENDING_EXPENSES', `Còn ${pendingExpenses} khoản chi chờ duyệt. Duyệt hoặc từ chối hết trước khi chốt sổ.`)
  if (input.report.trim().length < MIN_REPORT_LENGTH)
    return fail(
      'invalid',
      'REPORT_TOO_SHORT',
      `Báo cáo tổng kết cần ít nhất ${MIN_REPORT_LENGTH} ký tự: đã làm được gì, trao cho ai, còn dư hay thiếu gì.`,
    )
  return OK
}

/** Huỷ dự án đã công khai, bắt buộc có lý do. Dự án vẫn công khai kèm lý do để người đã góp sức biết chuyện gì xảy ra. */
/** Ghi vào sổ cho các cam kết chưa bàn giao bị giải phóng khi dự án huỷ. */
export const RELEASED_BY_CANCEL = 'Tự động huỷ vì dự án đã huỷ.'

export function canCancelProject(project: ProjectRef, actor: Actor, input: CancelInput): RuleResult {
  if (actor.id !== project.coordinatorId)
    return fail('forbidden', 'NOT_COORDINATOR', 'Chỉ người điều phối mới huỷ được dự án.')
  if (project.status !== 'published' && project.status !== 'in_progress')
    return fail('conflict', 'PROJECT_NOT_CANCELLABLE', 'Chỉ huỷ được dự án đang kêu gọi hoặc đang thực hiện.')
  if (input.reason.trim().length < MIN_CANCEL_REASON_LENGTH)
    return fail('invalid', 'REASON_REQUIRED', `Ghi rõ lý do huỷ (ít nhất ${MIN_CANCEL_REASON_LENGTH} ký tự) để người đã góp sức hiểu.`)
  return OK
}

/**
 * Cam kết góp sức. Người điều phối tự cam kết cho dự án của mình chỉ khi có người thứ hai xác nhận được:
 * tiền thì chỉ người điều phối được xác nhận (BR-003), còn hiện vật / công sức cần người phụ trách tài chính.
 * Không chặn ở đây thì cam kết đó kẹt mãi ở "đã bàn giao" và dự án không bao giờ chốt sổ được.
 */
export function canCommit(
  project: ProjectRef,
  need: { targetQty: number; committedQty: number; kind: NeedKind },
  quantity: number,
  actor: Pick<Actor, 'id'>,
): RuleResult {
  if (!ACCEPTING_STATUSES.includes(project.status))
    return fail('conflict', 'PROJECT_NOT_ACCEPTING', 'Dự án chưa mở hoặc đã ngừng nhận đóng góp.')
  if (actor.id === project.coordinatorId && (need.kind === 'money' || !project.treasurerId))
    return fail(
      'forbidden',
      'SELF_PLEDGE',
      need.kind === 'money'
        ? 'Người điều phối không tự cam kết tiền cho dự án của mình: không ai khác được xác nhận khoản tiền đó (BR-003).'
        : 'Dự án không có người phụ trách tài chính nên không ai xác nhận được đóng góp của chính người điều phối. Phần bạn tự lo hãy kể trong Bảng tin.',
    )
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

  // Huỷ cam kết: chỉ khi chưa bàn giao — đồ đã trao thì phải đi tiếp tới bước xác nhận, không xoá được dấu vết.
  if (contribution.status === 'committed' && to === 'cancelled') {
    if (!isContributor && !isCoordinator)
      return fail('forbidden', 'NOT_ALLOWED', 'Chỉ người đóng góp hoặc người điều phối mới huỷ được cam kết.')
    return OK
  }

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
  return (['delivered', 'confirmed', 'cancelled'] as const).filter(
    (to) => canTransitionContribution(contribution, to, project, needKind, actor).ok,
  )
}

// ---------------------------------------------------------------------------
// Minh bạch: bảng tin và sổ thu chi.
// ---------------------------------------------------------------------------

export const MIN_UPDATE_LENGTH = 20
export const MIN_EXPENSE_DESCRIPTION_LENGTH = 10

/** Bảng tin: chỉ nhóm dự án (điều phối, tài chính) được đăng, và chỉ khi dự án đã công khai. */
export function canPostUpdate(project: ProjectRef, actor: Actor, input: UpdateInput): RuleResult {
  if (actor.id !== project.coordinatorId && actor.id !== project.treasurerId)
    return fail('forbidden', 'NOT_TEAM_MEMBER', 'Chỉ người điều phối hoặc người phụ trách tài chính mới đăng tin cho dự án.')
  if (!PUBLIC_PROJECT_STATUSES.includes(project.status))
    return fail('conflict', 'PROJECT_NOT_PUBLIC', 'Dự án cần được xác minh và công khai trước khi đăng tin.')
  if (input.body.trim().length < MIN_UPDATE_LENGTH)
    return fail('invalid', 'UPDATE_TOO_SHORT', `Tin cập nhật cần ít nhất ${MIN_UPDATE_LENGTH} ký tự: đã làm gì, tiếp theo là gì.`)
  return OK
}

/**
 * Ghi khoản chi: chỉ người phụ trách tài chính, trừ vào đúng một hạng mục tiền,
 * không vượt số dư sau khi đã giữ chỗ cho các khoản đang chờ duyệt.
 */
export function canRecordExpense(project: ProjectRef, actor: Actor, line: LedgerLine | undefined, input: ExpenseInput): RuleResult {
  if (actor.id !== project.treasurerId)
    return fail('forbidden', 'NOT_TREASURER', 'Chỉ người phụ trách tài chính của dự án mới ghi được khoản chi.')
  if (!ACCEPTING_STATUSES.includes(project.status))
    return fail('conflict', 'PROJECT_NOT_ACTIVE', 'Chỉ ghi khoản chi khi dự án đang kêu gọi hoặc đang thực hiện.')
  if (!line) return fail('invalid', 'NOT_MONEY_NEED', 'Khoản chi phải trừ vào một hạng mục tiền của dự án.')
  if (!Number.isInteger(input.amount) || input.amount <= 0)
    return fail('invalid', 'INVALID_AMOUNT', 'Số tiền chi phải là số nguyên lớn hơn 0.')
  const available = line.balance - line.pending
  if (input.amount > available)
    return fail(
      'conflict',
      'EXCEEDS_BALANCE',
      `Quỹ "${line.label}" chỉ còn ${available} ${line.unit} (đã trừ khoản đang chờ duyệt). Chỉ chi từ tiền đã được xác nhận nhận.`,
    )
  if (input.description.trim().length < MIN_EXPENSE_DESCRIPTION_LENGTH)
    return fail('invalid', 'DESCRIPTION_TOO_SHORT', `Ghi rõ đã chi cho việc gì (ít nhất ${MIN_EXPENSE_DESCRIPTION_LENGTH} ký tự).`)
  if (input.receiptUrl && !/^https?:\/\/\S+$/.test(input.receiptUrl.trim()))
    return fail('invalid', 'INVALID_RECEIPT_URL', 'Link biên lai phải bắt đầu bằng http:// hoặc https://.')
  return OK
}

/** Duyệt chi: người điều phối, không phải người đã ghi khoản đó (tách người ghi và người duyệt như BR-003). */
export function canReviewExpense(
  project: ProjectRef,
  actor: Actor,
  expense: Pick<ExpenseRow, 'status' | 'recordedBy'>,
  input: ExpenseReviewInput,
): RuleResult {
  if (actor.id !== project.coordinatorId)
    return fail('forbidden', 'NOT_COORDINATOR', 'Chỉ người điều phối mới duyệt được khoản chi.')
  if (actor.id === expense.recordedBy)
    return fail('forbidden', 'SELF_APPROVAL', 'Người ghi khoản chi không được tự duyệt khoản chi của mình.')
  if (expense.status !== 'pending') return fail('conflict', 'EXPENSE_NOT_PENDING', 'Khoản chi này đã được xử lý.')
  if (input.decision === 'reject' && !input.reason?.trim())
    return fail('invalid', 'REASON_REQUIRED', 'Từ chối khoản chi thì ghi lý do để người phụ trách tài chính biết cần bổ sung gì.')
  return OK
}
