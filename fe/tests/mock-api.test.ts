import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { DEMO_IDS } from '@gomnang/domain/demo-data.ts'
import type { ProjectInput } from '@gomnang/domain/types.ts'
import {
  ApiError,
  commitContribution,
  configureMock,
  createProject,
  deleteProject,
  getProject,
  getVerificationQueue,
  listProjects,
  resetMockData,
  reviewProject,
  requestAiAssessment,
  submitProject,
  transitionContribution,
  startProject,
  completeProject,
  cancelProject,
  postUpdate,
  recordExpense,
  reviewExpense,
} from '../src/libs/api/mock/index.ts'
import { setSessionUser, getSessionUser, DEMO_ACCOUNTS } from '../src/libs/api/mock/session.ts'
import { readStore, writeStore, seedStore, STORE_KEY } from '../src/libs/api/mock/store.ts'

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
/** Unit-only actor fixture. Privileged login acceptance uses real HTTP/password E2E. */
function verifierFixture() {
  const store = readStore()
  store.users.find((u) => u.id === U.hung)!.role = 'verifier'
  writeStore(store)
  setSessionUser(U.hung)
}

beforeEach(() => {
  memory.clear()
  resetMockData()
  configureMock({ delayMs: 0, slowDelayMs: 0, today: '2026-09-14' })
})

test('legacy mock user fields migrate without losing projects or restoring privileged identity', () => {
  const original = seedStore()
  const legacy = { ...original, users: original.users.map(({ role, identityVerified, ...user }) => ({ ...user, verified: identityVerified, isVerifier: role === 'verifier' })) }
  memory.set(STORE_KEY, JSON.stringify(legacy))
  memory.set('gomnang.currentUserId', U.tam)
  const migrated = readStore()
  assert.deepEqual(migrated.projects, original.projects)
  assert.equal(migrated.users.find((u) => u.id === U.tam)?.role, 'verifier')
  assert.equal(migrated.users.find((u) => u.id === U.mai)?.identityVerified, true)
  assert.equal(getSessionUser(), null)
  assert.ok(!DEMO_ACCOUNTS.some((u) => u.id === U.tam))
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
  const ids = (await listProjects()).items.map((p) => p.id)
  assert.ok(ids.includes(DEMO_IDS.projects.hoaMai))
  assert.ok(!ids.includes(DEMO_IDS.projects.boKenh))
})

test('US-3 danh sách ở bản chạy thử: cùng hợp đồng trang/tổng với backend, tìm không dấu, chế độ rỗng', async () => {
  const all = await listProjects({ pageSize: 48 })
  assert.equal(all.items.length, all.total)
  const second = await listProjects({ pageSize: 1, page: 2 })
  assert.deepEqual([second.page, second.pageSize, second.totalPages, second.items.length], [2, 1, all.total, 1])
  assert.deepEqual((await listProjects({ q: 'hoa mai' })).items.map((p) => p.id), [DEMO_IDS.projects.hoaMai])
  const empty = await listProjects({}, 'empty')
  assert.deepEqual([empty.total, empty.items.length], [0, 0])
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

  verifierFixture()
  await rejectsWith(reviewProject(created.id, { decision: 'reject' }), 422, 'REASON_REQUIRED')
  assert.equal((await reviewProject(created.id, { decision: 'approve' })).status, 'published')

  setSessionUser(U.an)
  const contribution = await commitContribution(created.id, { needItemId: needId, quantity: 150 })
  await rejectsWith(commitContribution(created.id, { needItemId: needId, quantity: 51 }), 422, 'EXCEEDS_REMAINING')
  await transitionContribution(contribution.id, { to: 'delivered' })
  await rejectsWith(transitionContribution(contribution.id, { to: 'confirmed' }), 403, 'SELF_CONFIRMATION')

  setSessionUser(U.khanh)
  assert.equal((await transitionContribution(contribution.id, { to: 'confirmed' })).status, 'confirmed')

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

test('Q-03 xoá bản nháp: chỉ người điều phối, chỉ bản nháp; xoá xong không mở lại được', async () => {
  setSessionUser(U.khanh)
  const created = await createProject(draftInput())
  setSessionUser(U.hung)
  await rejectsWith(deleteProject(created.id), 404, 'PROJECT_NOT_FOUND')
  setSessionUser(U.khanh)
  await rejectsWith(deleteProject(DEMO_IDS.projects.hoaMai), 409, 'PROJECT_NOT_DRAFT')
  await deleteProject(created.id)
  await rejectsWith(getProject(created.id), 404, 'PROJECT_NOT_FOUND')
})

test('chế độ "máy chủ lỗi" → 503 và không ghi gì vào dữ liệu', async () => {
  setSessionUser(U.khanh)
  const before = (await listProjects()).total
  await rejectsWith(createProject(draftInput(), 'error'), 503, 'SERVICE_UNAVAILABLE')
  verifierFixture()
  assert.equal((await getVerificationQueue()).length, 1, 'chỉ còn đúng dự án mẫu đang chờ')
  assert.equal((await listProjects()).total, before)
})

test('dữ liệu giữ lại giữa các lần gọi, và đặt lại thì về dữ liệu mẫu', async () => {
  setSessionUser(U.khanh)
  const created = await createProject(draftInput())
  assert.equal((await getProject(created.id)).name, 'Góc sách thiếu nhi khu phố 2')

  resetMockData()
  await rejectsWith(getProject(created.id), 404, 'PROJECT_NOT_FOUND')
})

test('vòng đời: chốt sổ cần mọi đóng góp có kết cục; huỷ cần lý do và ghi vết', async () => {
  const P = DEMO_IDS.projects
  setSessionUser(U.an)
  const report = { report: 'Đã trao đủ vở và sách giáo khoa cho 40 em, kèm biên nhận của nhà trường.' }
  await rejectsWith(completeProject(P.sachGiaoKhoa, report), 409, 'OPEN_CONTRIBUTIONS')
  const open = (await getProject(P.sachGiaoKhoa)).contributions.filter((c) => c.status === 'delivered')
  for (const c of open) await transitionContribution(c.id, { to: 'confirmed', note: 'Đã nhận đủ' })
  const done = await completeProject(P.sachGiaoKhoa, report)
  assert.equal(done.status, 'completed')
  assert.equal(done.report, report.report)
  await rejectsWith(startProject(P.sachGiaoKhoa), 409, 'PROJECT_NOT_PUBLISHED')

  setSessionUser(U.khanh)
  await rejectsWith(cancelProject(P.hoaMai, { reason: 'bận' }), 422, 'REASON_REQUIRED')
  const cancelled = await cancelProject(P.hoaMai, { reason: 'Mái ấm đã được đơn vị khác tài trợ đủ.' })
  assert.equal(cancelled.status, 'cancelled')
  assert.equal(cancelled.auditLog.find((e) => e.entityType === 'project' && e.toState === 'cancelled')?.reason, 'Mái ấm đã được đơn vị khác tài trợ đủ.')
  assert.ok(!cancelled.contributions.some((c) => c.status === 'committed'), 'cam kết chưa bàn giao được giải phóng')
  assert.ok((await listProjects({ status: 'cancelled' })).items.some((p) => p.id === P.hoaMai), 'dự án huỷ vẫn công khai')
})

test('bảng tin và sổ thu chi: cùng luật, cùng mã lỗi với backend', async () => {
  const P = DEMO_IDS.projects
  const gas = DEMO_IDS.needs.gas
  setSessionUser(U.an)
  await rejectsWith(postUpdate(P.hoaMai, { body: 'Mình góp thêm được 10 phần cơm nhé mọi người.' }), 403, 'NOT_TEAM_MEMBER')
  setSessionUser(U.mai)
  const update = await postUpdate(P.hoaMai, { body: 'Thứ Bảy 9h tập kết ở mái ấm, cần 5 bạn phụ bếp.' })
  assert.equal((await getProject(P.hoaMai)).updates[0].id, update.id)

  const expense = { needItemId: gas, amount: 60, description: 'Mua thêm 1 bình gas mini cho nồi canh' }
  await rejectsWith(recordExpense(P.hoaMai, { ...expense, amount: 61 }), 409, 'EXCEEDS_BALANCE')
  const recorded = await recordExpense(P.hoaMai, expense)
  await rejectsWith(reviewExpense(recorded.id, { decision: 'approve' }), 403, 'NOT_COORDINATOR')

  setSessionUser(U.khanh)
  await rejectsWith(reviewExpense(recorded.id, { decision: 'reject' }), 422, 'REASON_REQUIRED')
  const approved = await reviewExpense(recorded.id, { decision: 'approve' })
  assert.equal(approved.status, 'approved')
  assert.equal(approved.reviewedBy?.name, 'Võ Tuấn Khanh')
})

test('đánh giá AI ở bản chạy thử: kiểm quyền như backend, rồi báo không có máy chủ AI', async () => {
  const P = DEMO_IDS.projects
  setSessionUser(U.an)
  await rejectsWith(requestAiAssessment(P.boKenh, { model: 'ollama' }), 404, 'PROJECT_NOT_FOUND')
  verifierFixture()
  await rejectsWith(requestAiAssessment(P.hoaMai, { model: 'ollama' }), 409, 'PROJECT_NOT_PENDING')
  await rejectsWith(requestAiAssessment(P.boKenh, { model: 'ollama' }), 503, 'AI_MODEL_UNAVAILABLE')
})
