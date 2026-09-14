import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { DEMO_IDS } from '@gomnang/domain/demo-data.ts'
import type { ProjectInput } from '@gomnang/domain/types.ts'
import {
  ApiError,
  commitContribution,
  configureMock,
  createProject,
  getProject,
  getVerificationQueue,
  listProjects,
  resetMockData,
  reviewProject,
  submitProject,
  transitionContribution,
} from '../src/libs/api/mock/index.ts'
import { setSessionUser } from '../src/libs/api/mock/session.ts'

/**
 * Test cho mock API của Homework 3B: toàn bộ luồng người dùng phải chạy được trên dữ liệu giả,
 * và mock phải từ chối đúng những gì backend từ chối, với cùng mã HTTP và mã lỗi.
 */

// Node không có localStorage — giả lập bằng một Map.
const memory = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, String(value)),
    removeItem: (key: string) => void memory.delete(key),
  },
})

const U = DEMO_IDS.users

beforeEach(() => {
  memory.clear()
  resetMockData()
  configureMock({ delayMs: 0, slowDelayMs: 0, today: '2026-09-14' })
})

const draftInput = (): ProjectInput => ({
  name: 'Góc sách thiếu nhi khu phố 2',
  goal: 'Gom 200 cuốn sách thiếu nhi cho góc đọc tại nhà văn hoá khu phố.',
  beneficiaryGroup: 'Học sinh thiếu điều kiện học tập',
  location: 'Khu phố 2, Phường Linh Xuân',
  startDate: '2026-10-01',
  endDate: '2026-10-01',
  treasurerId: null,
  needItems: [{ label: 'Sách thiếu nhi', unit: 'cuốn', kind: 'goods', targetQty: 200 }],
})

async function rejectsWith(promise: Promise<unknown>, status: number, code: string) {
  await assert.rejects(promise, (err: unknown) => {
    assert.ok(err instanceof ApiError, 'phải ném ApiError')
    assert.equal(err.status, status)
    assert.equal(err.code, code)
    return true
  })
}

test('danh sách công khai không lộ dự án đang chờ xác minh', async () => {
  const ids = (await listProjects()).map((p) => p.id)
  assert.ok(ids.includes(DEMO_IDS.projects.hoaMai))
  assert.ok(!ids.includes(DEMO_IDS.projects.boKenh))
})

test('khách chưa đăng nhập tạo dự án → 401', async () => {
  setSessionUser(null)
  await rejectsWith(createProject(draftInput()), 401, 'AUTH_REQUIRED')
})

test('dữ liệu sai quy tắc → 422 kèm lỗi theo từng trường, giống backend', async () => {
  setSessionUser(U.khanh)
  const input = { ...draftInput(), treasurerId: U.khanh }
  await assert.rejects(createProject(input), (err: unknown) => {
    assert.ok(err instanceof ApiError)
    assert.equal(err.status, 422)
    assert.match(err.details?.treasurerId ?? '', /BR-003/)
    return true
  })
})

test('luồng đầy đủ chạy được trên mock: tạo → gửi xác minh → duyệt → cam kết → bàn giao → xác nhận', async () => {
  setSessionUser(U.khanh)
  const created = await createProject(draftInput())
  assert.equal(created.status, 'draft')
  const needId = created.needs[0].id

  const submitted = await submitProject(created.id)
  assert.equal(submitted.status, 'pending_verification')
  assert.ok(submitted.latestAssessment, 'phải có kết quả của người gác cổng')

  setSessionUser(U.tam)
  await rejectsWith(reviewProject(created.id, { decision: 'reject' }), 422, 'REASON_REQUIRED')
  assert.equal((await reviewProject(created.id, { decision: 'approve' })).status, 'published')

  setSessionUser(U.an)
  const contribution = await commitContribution(created.id, { needItemId: needId, quantity: 150 })
  await rejectsWith(commitContribution(created.id, { needItemId: needId, quantity: 51 }), 422, 'EXCEEDS_REMAINING')
  await transitionContribution(contribution.id, 'delivered')
  await rejectsWith(transitionContribution(contribution.id, 'confirmed'), 403, 'SELF_CONFIRMATION')

  setSessionUser(U.khanh)
  assert.equal((await transitionContribution(contribution.id, 'confirmed')).status, 'confirmed')

  const detail = await getProject(created.id)
  assert.deepEqual([detail.needs[0].committedQty, detail.needs[0].confirmedQty], [150, 150])
  assert.deepEqual(
    detail.auditLog.map((a) => a.toState),
    ['draft', 'pending_verification', 'published', 'committed', 'delivered', 'confirmed'],
  )
})

test('người không phải người xác minh mở hàng chờ → 403', async () => {
  setSessionUser(U.an)
  await rejectsWith(getVerificationQueue(), 403, 'NOT_VERIFIER')
})

test('bản nháp bị ẩn với người ngoài dự án → 404', async () => {
  setSessionUser(U.khanh)
  const created = await createProject(draftInput())
  setSessionUser(U.hung)
  await rejectsWith(getProject(created.id), 404, 'PROJECT_NOT_FOUND')
})

test('chế độ "máy chủ lỗi" → 503 và không ghi gì vào dữ liệu', async () => {
  setSessionUser(U.khanh)
  const before = (await listProjects()).length
  await rejectsWith(createProject(draftInput(), 'error'), 503, 'SERVICE_UNAVAILABLE')
  setSessionUser(U.tam)
  assert.equal((await getVerificationQueue()).length, 1, 'chỉ còn đúng dự án mẫu đang chờ')
  assert.equal((await listProjects()).length, before)
})

test('dữ liệu giữ lại giữa các lần gọi, và đặt lại thì về dữ liệu mẫu', async () => {
  setSessionUser(U.khanh)
  const created = await createProject(draftInput())
  assert.equal((await getProject(created.id)).name, 'Góc sách thiếu nhi khu phố 2')

  resetMockData()
  await rejectsWith(getProject(created.id), 404, 'PROJECT_NOT_FOUND')
})
