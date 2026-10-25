import test from 'node:test'
import assert from 'node:assert/strict'
import {
  allowedTransitions,
  canCancelProject,
  canCommit,
  canCompleteProject,
  canDeleteProject,
  canUploadReceipt,
  canViewReceipt,
  canEditProject,
  canPostUpdate,
  canRequestAiAssessment,
  canRecordExpense,
  canReviewExpense,
  canReviewProject,
  canStartProject,
  canTransitionContribution,
  canViewProject,
  type RuleResult,
} from './rules.ts'
import type { ProjectStatus } from './types.ts'
import { ledgerLines } from './views.ts'

const COORDINATOR = { id: 'khanh', role: 'user' as const }
const TREASURER = { id: 'mai', role: 'user' as const }
const CONTRIBUTOR = { id: 'an', role: 'user' as const }
const STRANGER = { id: 'hung', role: 'user' as const }
const VERIFIER = { id: 'tam', role: 'verifier' as const }

const project = (status: ProjectStatus) => ({ status, coordinatorId: 'khanh', treasurerId: 'mai' })
const delivered = { status: 'delivered' as const, contributorId: 'an' }
const committed = { status: 'committed' as const, contributorId: 'an' }

function assertFails(result: RuleResult, code: string) {
  assert.equal(result.ok, false, `mong đợi bị từ chối với ${code}`)
  if (!result.ok) assert.equal(result.code, code)
}

test('bản nháp bị ẩn với người ngoài, hiện với người trong dự án và người xác minh', () => {
  const draft = project('draft')
  assert.equal(canViewProject(draft, null), false)
  assert.equal(canViewProject(draft, STRANGER), false)
  assert.equal(canViewProject(draft, COORDINATOR), true)
  assert.equal(canViewProject(draft, TREASURER), true)
  assert.equal(canViewProject(draft, VERIFIER), true)
  assert.equal(canViewProject(project('published'), null), true)
})

test('chỉ người điều phối sửa được, và chỉ khi còn là bản nháp', () => {
  assertFails(canEditProject(project('draft'), STRANGER), 'NOT_COORDINATOR')
  assertFails(canEditProject(project('published'), COORDINATOR), 'PROJECT_NOT_DRAFT')
  assert.equal(canEditProject(project('draft'), COORDINATOR).ok, true)
})

test('Q-03 xoá dự án: chỉ người điều phối, chỉ bản nháp — dự án đã công khai phải huỷ', () => {
  assertFails(canDeleteProject(project('draft'), STRANGER), 'NOT_COORDINATOR')
  assertFails(canDeleteProject(project('draft'), TREASURER), 'NOT_COORDINATOR')
  assertFails(canDeleteProject(project('draft'), VERIFIER), 'NOT_COORDINATOR')
  for (const status of ['pending_verification', 'published', 'in_progress', 'completed', 'cancelled'] as const)
    assertFails(canDeleteProject(project(status), COORDINATOR), 'PROJECT_NOT_DRAFT')
  assert.equal(canDeleteProject(project('draft'), COORDINATOR).ok, true)
})

test('duyệt dự án: phải là người xác minh, không xung đột lợi ích, dự án đang chờ, trả lại phải có lý do', () => {
  const pending = project('pending_verification')
  assertFails(canReviewProject(pending, STRANGER, { decision: 'approve' }), 'NOT_VERIFIER')
  assertFails(
    canReviewProject(pending, { id: 'khanh', role: 'verifier' as const }, { decision: 'approve' }),
    'CONFLICT_OF_INTEREST',
  )
  assertFails(canReviewProject(project('draft'), VERIFIER, { decision: 'approve' }), 'PROJECT_NOT_PENDING')
  assertFails(canReviewProject(pending, VERIFIER, { decision: 'reject', reason: '   ' }), 'REASON_REQUIRED')
  assert.equal(canReviewProject(pending, VERIFIER, { decision: 'approve' }).ok, true)
})

test('admin role does not grant verifier authority or visibility into unrelated drafts', () => {
  const admin = { id: 'admin', role: 'admin' as const }
  assert.equal(canViewProject(project('draft'), admin), false)
  assertFails(canReviewProject(project('pending_verification'), admin, { decision: 'approve' }), 'NOT_VERIFIER')
})

test('cam kết đóng góp không được vượt phần còn thiếu', () => {
  const need = { targetQty: 100, committedQty: 70, kind: 'goods' as const }
  assertFails(canCommit(project('draft'), need, 10, CONTRIBUTOR), 'PROJECT_NOT_ACCEPTING')
  assertFails(canCommit(project('published'), need, 0, CONTRIBUTOR), 'INVALID_QUANTITY')
  const tooMuch = canCommit(project('published'), need, 31, CONTRIBUTOR)
  assertFails(tooMuch, 'EXCEEDS_REMAINING')
  if (!tooMuch.ok) assert.match(tooMuch.message, /còn thiếu 30/)
  assert.equal(canCommit(project('published'), need, 30, CONTRIBUTOR).ok, true)
})

test('đánh dấu đã bàn giao: người đóng góp hoặc người điều phối', () => {
  const p = project('published')
  assert.equal(canTransitionContribution(committed, 'delivered', p, 'goods', CONTRIBUTOR).ok, true)
  assert.equal(canTransitionContribution(committed, 'delivered', p, 'goods', COORDINATOR).ok, true)
  assertFails(canTransitionContribution(committed, 'delivered', p, 'goods', STRANGER), 'NOT_ALLOWED')
})

test('người đóng góp không được tự xác nhận đóng góp của mình', () => {
  assertFails(
    canTransitionContribution(delivered, 'confirmed', project('published'), 'goods', CONTRIBUTOR),
    'SELF_CONFIRMATION',
  )
})

test('BR-003: tiền chỉ người điều phối được xác nhận, người giữ tiền thì không', () => {
  const p = project('published')
  assertFails(canTransitionContribution(delivered, 'confirmed', p, 'money', TREASURER), 'MONEY_NEEDS_COORDINATOR')
  assert.equal(canTransitionContribution(delivered, 'confirmed', p, 'money', COORDINATOR).ok, true)
  assert.equal(canTransitionContribution(delivered, 'confirmed', p, 'goods', TREASURER).ok, true)
})

test('không được nhảy cóc trạng thái đóng góp', () => {
  assertFails(
    canTransitionContribution(committed, 'confirmed', project('published'), 'goods', COORDINATOR),
    'INVALID_TRANSITION',
  )
})

test('allowedTransitions trả đúng những nút được hiện cho từng người', () => {
  const p = project('published')
  assert.deepEqual(allowedTransitions(committed, p, 'goods', CONTRIBUTOR), ['delivered', 'cancelled'])
  assert.deepEqual(allowedTransitions(delivered, p, 'goods', CONTRIBUTOR), [])
  assert.deepEqual(allowedTransitions(delivered, p, 'goods', TREASURER), ['confirmed'])
  assert.deepEqual(allowedTransitions(delivered, p, 'goods', null), [])
})

test('bắt đầu thực hiện: chỉ người điều phối, chỉ khi đang kêu gọi', () => {
  assertFails(canStartProject(project('published'), CONTRIBUTOR), 'NOT_COORDINATOR')
  assertFails(canStartProject(project('draft'), COORDINATOR), 'PROJECT_NOT_PUBLISHED')
  assert.equal(canStartProject(project('published'), COORDINATOR).ok, true)
})

test('hoàn thành: cần báo cáo đủ dài và mọi đóng góp đã có kết cục', () => {
  const report = { report: 'Đã trao 100 phần cơm cho mái ấm, dư 5 hộp sữa gửi lại bếp ăn.' }
  assertFails(canCompleteProject(project('published'), COORDINATOR, report, []), 'PROJECT_NOT_IN_PROGRESS')
  assertFails(canCompleteProject(project('in_progress'), TREASURER, report, []), 'NOT_COORDINATOR')
  assertFails(canCompleteProject(project('in_progress'), COORDINATOR, report, [{ status: 'delivered' }]), 'OPEN_CONTRIBUTIONS')
  assertFails(canCompleteProject(project('in_progress'), COORDINATOR, { report: 'xong' }, []), 'REPORT_TOO_SHORT')
  assert.equal(canCompleteProject(project('in_progress'), COORDINATOR, report, [{ status: 'confirmed' }, { status: 'cancelled' }]).ok, true)
})

test('huỷ dự án: chỉ dự án đã công khai, bắt buộc lý do', () => {
  const reason = { reason: 'Mái ấm đã được một đơn vị khác tài trợ đủ.' }
  assertFails(canCancelProject(project('draft'), COORDINATOR, reason), 'PROJECT_NOT_CANCELLABLE')
  assertFails(canCancelProject(project('published'), CONTRIBUTOR, reason), 'NOT_COORDINATOR')
  assertFails(canCancelProject(project('published'), COORDINATOR, { reason: 'bận' }), 'REASON_REQUIRED')
  assert.equal(canCancelProject(project('in_progress'), COORDINATOR, reason).ok, true)
})

test('huỷ cam kết: người đóng góp hoặc người điều phối, chỉ khi chưa bàn giao', () => {
  assert.equal(canTransitionContribution(committed, 'cancelled', project('published'), 'goods', CONTRIBUTOR).ok, true)
  assert.equal(canTransitionContribution(committed, 'cancelled', project('published'), 'goods', COORDINATOR).ok, true)
  assertFails(canTransitionContribution(committed, 'cancelled', project('published'), 'goods', STRANGER), 'NOT_ALLOWED')
  assertFails(canTransitionContribution(delivered, 'cancelled', project('published'), 'goods', CONTRIBUTOR), 'INVALID_TRANSITION')
  assert.deepEqual(allowedTransitions(committed, project('published'), 'goods', CONTRIBUTOR), ['delivered', 'cancelled'])
})

test('bảng tin: chỉ nhóm dự án, chỉ khi đã công khai, nội dung đủ dài', () => {
  const body = { body: 'Đã tập kết đủ gạo, thứ Bảy nấu và phát ở mái ấm.' }
  assertFails(canPostUpdate(project('published'), CONTRIBUTOR, body), 'NOT_TEAM_MEMBER')
  assertFails(canPostUpdate(project('draft'), COORDINATOR, body), 'PROJECT_NOT_PUBLIC')
  assertFails(canPostUpdate(project('published'), TREASURER, { body: 'ok' }), 'UPDATE_TOO_SHORT')
  assert.equal(canPostUpdate(project('in_progress'), TREASURER, body).ok, true)
  assert.equal(canPostUpdate(project('completed'), COORDINATOR, body).ok, true)
})

test('sổ thu chi: số dư = tiền đã xác nhận − khoản đã duyệt; khoản chờ duyệt giữ chỗ', () => {
  const needs = [
    { id: 'gas', label: 'Tiền gas', unit: 'nghìn đồng', kind: 'money' as const, targetQty: 500, confirmedQty: 300 },
    { id: 'com', label: 'Cơm', unit: 'phần', kind: 'goods' as const, targetQty: 100, confirmedQty: 30 },
  ]
  const [line] = ledgerLines(needs, [
    { needItemId: 'gas', amount: 120, status: 'approved' },
    { needItemId: 'gas', amount: 50, status: 'pending' },
    { needItemId: 'gas', amount: 999, status: 'rejected' },
  ])
  assert.deepEqual(line, { needItemId: 'gas', label: 'Tiền gas', unit: 'nghìn đồng', budget: 500, received: 300, spent: 120, pending: 50, balance: 180 })
  assert.equal(ledgerLines(needs, []).length, 1, 'chỉ hạng mục tiền mới có dòng ngân sách')

  const input = { needItemId: 'gas', amount: 130, description: 'Mua 2 bình gas ở đại lý Linh Trung' }
  assertFails(canRecordExpense(project('in_progress'), COORDINATOR, line, input), 'NOT_TREASURER')
  assertFails(canRecordExpense(project('completed'), TREASURER, line, input), 'PROJECT_NOT_ACTIVE')
  assertFails(canRecordExpense(project('in_progress'), TREASURER, undefined, input), 'NOT_MONEY_NEED')
  const over = canRecordExpense(project('in_progress'), TREASURER, line, { ...input, amount: 131 })
  assertFails(over, 'EXCEEDS_BALANCE')
  if (!over.ok) assert.match(over.message, /chỉ còn 130 nghìn đồng/)
  assertFails(canRecordExpense(project('in_progress'), TREASURER, line, { ...input, description: 'gas' }), 'DESCRIPTION_TOO_SHORT')
  assertFails(canRecordExpense(project('in_progress'), TREASURER, line, { ...input, receiptUrl: 'drive/abc' }), 'INVALID_RECEIPT_URL')
  assert.equal(canRecordExpense(project('in_progress'), TREASURER, line, { ...input, receiptUrl: 'https://drive.google.com/x' }).ok, true)
})

test('US-5 chứng từ: chỉ người giữ tiền tải khi dự án còn nhận đóng góp; quyền xem theo trạng thái khoản chi', () => {
  assertFails(canUploadReceipt(project('published'), COORDINATOR), 'NOT_TREASURER')
  assertFails(canUploadReceipt(project('completed'), TREASURER), 'PROJECT_NOT_ACTIVE')
  assert.equal(canUploadReceipt(project('in_progress'), TREASURER).ok, true)

  const loose = { uploadedBy: 'mai', expenseStatus: null }
  assert.equal(canViewReceipt(loose, project('published'), TREASURER), true)
  assert.equal(canViewReceipt(loose, project('published'), COORDINATOR), false, 'chưa gắn khoản chi: chỉ người tải')
  const pending = { uploadedBy: 'mai', expenseStatus: 'pending' as const }
  assert.equal(canViewReceipt(pending, project('published'), COORDINATOR), true)
  assert.equal(canViewReceipt(pending, project('published'), STRANGER), false)
  assert.equal(canViewReceipt(pending, project('published'), null), false)
  const approved = { uploadedBy: 'mai', expenseStatus: 'approved' as const }
  assert.equal(canViewReceipt(approved, project('published'), null), true, 'đã duyệt: công khai như sao kê')
  assert.equal(canViewReceipt({ uploadedBy: 'mai', expenseStatus: 'rejected' as const }, project('published'), STRANGER), false)
})

test('duyệt chi: người điều phối, không tự duyệt, từ chối phải có lý do', () => {
  const pending = { status: 'pending' as const, recordedBy: 'mai' }
  assertFails(canReviewExpense(project('in_progress'), TREASURER, pending, { decision: 'approve' }), 'NOT_COORDINATOR')
  assertFails(canReviewExpense(project('in_progress'), COORDINATOR, { ...pending, recordedBy: 'khanh' }, { decision: 'approve' }), 'SELF_APPROVAL')
  assertFails(canReviewExpense(project('in_progress'), COORDINATOR, { ...pending, status: 'approved' }, { decision: 'approve' }), 'EXPENSE_NOT_PENDING')
  assertFails(canReviewExpense(project('in_progress'), COORDINATOR, pending, { decision: 'reject', reason: ' ' }), 'REASON_REQUIRED')
  assert.equal(canReviewExpense(project('in_progress'), COORDINATOR, pending, { decision: 'approve' }).ok, true)
})

test('chốt sổ bị chặn khi còn khoản chi chờ duyệt', () => {
  const report = { report: 'Đã trao 100 phần cơm cho mái ấm, dư 5 hộp sữa gửi lại bếp ăn.' }
  assertFails(canCompleteProject(project('in_progress'), COORDINATOR, report, [], 2), 'PENDING_EXPENSES')
})

test('người điều phối chỉ tự cam kết khi có người thứ hai xác nhận được', () => {
  const goods = { targetQty: 100, committedQty: 0, kind: 'goods' as const }
  const money = { ...goods, kind: 'money' as const }
  const noTreasurer = { ...project('published'), treasurerId: null }
  assertFails(canCommit(project('published'), money, 10, COORDINATOR), 'SELF_PLEDGE')
  assertFails(canCommit(noTreasurer, goods, 10, COORDINATOR), 'SELF_PLEDGE')
  assert.equal(canCommit(project('published'), goods, 10, COORDINATOR).ok, true, 'có người tài chính xác nhận hộ')
  assert.equal(canCommit(project('published'), money, 10, TREASURER).ok, true, 'người điều phối xác nhận tiền của người tài chính')
})

test('nhờ AI đánh giá: chỉ người xác minh ngoài dự án, khi dự án đang chờ xác minh', () => {
  assertFails(canRequestAiAssessment(project('pending_verification'), STRANGER), 'NOT_VERIFIER')
  assertFails(canRequestAiAssessment(project('pending_verification'), { id: 'khanh', role: 'verifier' as const }), 'CONFLICT_OF_INTEREST')
  assertFails(canRequestAiAssessment(project('published'), VERIFIER), 'PROJECT_NOT_PENDING')
  assert.equal(canRequestAiAssessment(project('pending_verification'), VERIFIER).ok, true)
})
