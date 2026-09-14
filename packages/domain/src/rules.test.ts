import test from 'node:test'
import assert from 'node:assert/strict'
import {
  allowedTransitions,
  canCommit,
  canEditProject,
  canReviewProject,
  canTransitionContribution,
  canViewProject,
  type RuleResult,
} from './rules.ts'
import type { ProjectStatus } from './types.ts'

const COORDINATOR = { id: 'khanh', isVerifier: false }
const TREASURER = { id: 'mai', isVerifier: false }
const CONTRIBUTOR = { id: 'an', isVerifier: false }
const STRANGER = { id: 'hung', isVerifier: false }
const VERIFIER = { id: 'tam', isVerifier: true }

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

test('duyệt dự án: phải là người xác minh, không xung đột lợi ích, dự án đang chờ, trả lại phải có lý do', () => {
  const pending = project('pending_verification')
  assertFails(canReviewProject(pending, STRANGER, { decision: 'approve' }), 'NOT_VERIFIER')
  assertFails(
    canReviewProject(pending, { id: 'khanh', isVerifier: true }, { decision: 'approve' }),
    'CONFLICT_OF_INTEREST',
  )
  assertFails(canReviewProject(project('draft'), VERIFIER, { decision: 'approve' }), 'PROJECT_NOT_PENDING')
  assertFails(canReviewProject(pending, VERIFIER, { decision: 'reject', reason: '   ' }), 'REASON_REQUIRED')
  assert.equal(canReviewProject(pending, VERIFIER, { decision: 'approve' }).ok, true)
})

test('cam kết đóng góp không được vượt phần còn thiếu', () => {
  const need = { targetQty: 100, committedQty: 70 }
  assertFails(canCommit(project('draft'), need, 10), 'PROJECT_NOT_ACCEPTING')
  assertFails(canCommit(project('published'), need, 0), 'INVALID_QUANTITY')
  const tooMuch = canCommit(project('published'), need, 31)
  assertFails(tooMuch, 'EXCEEDS_REMAINING')
  if (!tooMuch.ok) assert.match(tooMuch.message, /còn thiếu 30/)
  assert.equal(canCommit(project('published'), need, 30).ok, true)
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
  assert.deepEqual(allowedTransitions(committed, p, 'goods', CONTRIBUTOR), ['delivered'])
  assert.deepEqual(allowedTransitions(delivered, p, 'goods', CONTRIBUTOR), [])
  assert.deepEqual(allowedTransitions(delivered, p, 'goods', TREASURER), ['confirmed'])
  assert.deepEqual(allowedTransitions(delivered, p, 'goods', null), [])
})
