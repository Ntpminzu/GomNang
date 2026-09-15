import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, beforeEach, test } from 'node:test'
import { DEMO_IDS } from '@gomnang/shared/demo-data.ts'
import type { ProjectInput } from '@gomnang/shared/types.ts'
import { createApp } from '../../backend/src/app.ts'
import { openDb } from '../../backend/src/db/client.ts'
import { seedIfEmpty } from '../../backend/src/db/seed.ts'
import { devLogin, login, register } from '../src/features/auth/auth.api.ts'
import { commitContribution, transitionContribution } from '../src/features/contributions/contributions.api.ts'
import { createProject, getProject, listProjects } from '../src/features/projects/projects.api.ts'
import { getVerificationQueue, reviewProject, submitProject } from '../src/features/verification/verification.api.ts'
import { ApiError } from '../src/lib/api-client.ts'
import { getSessionUser, getToken, saveSession } from '../src/lib/session.ts'

/**
 * Test tích hợp: client của frontend gọi backend THẬT qua HTTP.
 * Backend chạy ngay trong tiến trình test ở cổng ngẫu nhiên, database PGlite trong RAM nạp dữ liệu mẫu.
 * Nếu frontend và backend lệch contract — sai đường dẫn, sai tên trường, sai cách gửi token — test này hỏng.
 *
 * Nằm ở frontend/test/ chứ không cạnh một file nào, vì nó chạy xuyên mọi feature.
 */

process.env.LOG_SILENT = '1'

// Node không có localStorage — giả lập bằng một Map để lưu phiên đăng nhập.
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
let server: Server
let closeDb: () => Promise<void>

before(async () => {
  const { db, close } = await openDb(null)
  await seedIfEmpty(db)
  const app = createApp({
    db,
    secret: new TextEncoder().encode('web-integration-test-secret-0123456789'),
    devLoginEnabled: true,
    corsOrigins: [],
    today: () => '2026-09-14',
  })
  server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  process.env.NEXT_PUBLIC_API_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  closeDb = close
})

after(async () => {
  server.close()
  server.closeAllConnections()
  await closeDb()
})

beforeEach(() => memory.clear())

async function loginAs(email: string) {
  const { token, user } = await devLogin(email)
  saveSession(token, { id: user.id, name: user.name, isVerifier: user.isVerifier })
}

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

test('khách xem được danh sách công khai lấy từ backend', async () => {
  const ids = (await listProjects()).map((p) => p.id)
  assert.ok(ids.includes(DEMO_IDS.projects.hoaMai))
  assert.ok(!ids.includes(DEMO_IDS.projects.boKenh), 'dự án chờ xác minh không được hiện')
})

test('khách tạo dự án → 401 từ backend', async () => {
  await rejectsWith(createProject(draftInput()), 401, 'AUTH_REQUIRED')
})

test('đăng nhập bằng tài khoản mẫu lưu được phiên và token', async () => {
  await loginAs('khanh@gomnang.test')
  assert.equal(getSessionUser()?.name, 'Võ Tuấn Khanh')
  assert.ok(getToken())
})

test('đăng ký → token dùng được ngay → đăng nhập lại bằng cùng email và mật khẩu', async () => {
  const input = { displayName: 'Đặng Thu Hà', email: 'thuha@example.com', password: 'mat-khau-thu-ha' }
  const registered = await register(input)
  const { id, ...profile } = registered.user
  assert.deepEqual(profile, { name: 'Đặng Thu Hà', verified: false, isVerifier: false, email: 'thuha@example.com' })

  // Tài khoản chưa xác minh vẫn tạo được bản nháp — backend chấp nhận token do /register phát.
  saveSession(registered.token, { id, name: profile.name, isVerifier: profile.isVerifier })
  assert.equal((await createProject(draftInput())).status, 'draft')

  memory.clear()
  const loggedIn = await login({ email: input.email, password: input.password })
  assert.equal(loggedIn.user.id, id)
  assert.ok(loggedIn.token)
})

test('sai mật khẩu, hoặc tài khoản mẫu chưa có mật khẩu → 401 INVALID_CREDENTIALS', async () => {
  await register({ displayName: 'Lý Quốc Bảo', email: 'quocbao@example.com', password: 'mat-khau-dung' })
  await rejectsWith(login({ email: 'quocbao@example.com', password: 'mat-khau-sai' }), 401, 'INVALID_CREDENTIALS')
  await rejectsWith(login({ email: 'khanh@gomnang.test', password: 'mat-khau-bat-ky' }), 401, 'INVALID_CREDENTIALS')
})

test('đang đăng nhập mà nhập sai mật khẩu tài khoản khác → 401 nhưng phiên hiện tại vẫn còn', async () => {
  await loginAs('khanh@gomnang.test')
  const token = getToken()
  await rejectsWith(login({ email: 'khanh@gomnang.test', password: 'mat-khau-sai' }), 401, 'INVALID_CREDENTIALS')
  assert.equal(getToken(), token)
  assert.equal(getSessionUser()?.name, 'Võ Tuấn Khanh')
})

test('đăng ký trùng email (khác hoa thường) → 409 EMAIL_TAKEN kèm lỗi ở ô email', async () => {
  const input = { displayName: 'Hồ Ngọc Lan', email: 'ngoclan@example.com', password: 'mat-khau-ngoc-lan' }
  await register(input)
  await assert.rejects(register({ ...input, email: 'NgocLan@Example.com' }), (err: unknown) => {
    assert.ok(err instanceof ApiError)
    assert.equal(err.status, 409)
    assert.equal(err.code, 'EMAIL_TAKEN')
    assert.ok(err.details?.email)
    return true
  })
})

test('lỗi quy tắc từ backend về tới client kèm lỗi theo từng ô', async () => {
  await loginAs('khanh@gomnang.test')
  const input: ProjectInput = {
    ...draftInput(),
    treasurerId: U.khanh,
    needItems: [{ label: 'Tiền gas', unit: 'nghìn đồng', kind: 'money', targetQty: 500 }],
  }
  await assert.rejects(createProject(input), (err: unknown) => {
    assert.ok(err instanceof ApiError)
    assert.equal(err.status, 422)
    assert.match(err.details?.treasurerId ?? '', /BR-003/)
    return true
  })
})

test('luồng đầy đủ đi qua backend thật: tạo → gửi xác minh → duyệt → cam kết → bàn giao → xác nhận', async () => {
  await loginAs('khanh@gomnang.test')
  const created = await createProject(draftInput())
  assert.equal(created.status, 'draft')
  const needId = created.needs[0].id
  assert.equal((await submitProject(created.id)).status, 'pending_verification')

  await loginAs('tam@gomnang.test')
  await rejectsWith(reviewProject(created.id, { decision: 'reject' }), 422, 'REASON_REQUIRED')
  assert.ok((await getVerificationQueue()).some((p) => p.id === created.id))
  assert.equal((await reviewProject(created.id, { decision: 'approve' })).status, 'published')

  await loginAs('an@gomnang.test')
  await rejectsWith(getVerificationQueue(), 403, 'NOT_VERIFIER')
  const contribution = await commitContribution(created.id, { needItemId: needId, quantity: 150 })
  await rejectsWith(commitContribution(created.id, { needItemId: needId, quantity: 51 }), 422, 'EXCEEDS_REMAINING')
  await transitionContribution(contribution.id, 'delivered')
  await rejectsWith(transitionContribution(contribution.id, 'confirmed'), 403, 'SELF_CONFIRMATION')

  await loginAs('khanh@gomnang.test')
  assert.equal((await transitionContribution(contribution.id, 'confirmed')).status, 'confirmed')

  const detail = await getProject(created.id)
  assert.deepEqual([detail.needs[0].committedQty, detail.needs[0].confirmedQty], [150, 150])
  assert.deepEqual(
    detail.auditLog.map((a) => a.toState),
    ['draft', 'pending_verification', 'published', 'committed', 'delivered', 'confirmed'],
  )
})

test('máy chủ tắt → ApiError NETWORK_ERROR với mã 0, không treo', async () => {
  // Mở rồi đóng ngay một cổng để chắc chắn không có gì đang nghe ở đó.
  const probe = createServer().listen(0, '127.0.0.1')
  await once(probe, 'listening')
  const deadPort = (probe.address() as AddressInfo).port
  await new Promise((resolve) => probe.close(resolve))

  const liveUrl = process.env.NEXT_PUBLIC_API_URL
  process.env.NEXT_PUBLIC_API_URL = `http://127.0.0.1:${deadPort}`
  try {
    await rejectsWith(listProjects(), 0, 'NETWORK_ERROR')
  } finally {
    process.env.NEXT_PUBLIC_API_URL = liveUrl
  }
})

test('token hỏng → 401 và phiên trên trình duyệt bị xoá', async () => {
  saveSession('khong.phai.token', { id: U.khanh, name: 'Võ Tuấn Khanh', isVerifier: false })
  await rejectsWith(createProject(draftInput()), 401, 'INVALID_TOKEN')
  assert.equal(getSessionUser(), null)
})
