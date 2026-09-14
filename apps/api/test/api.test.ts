import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, test } from 'node:test'
import { sql } from 'drizzle-orm'
import { DEMO_IDS } from '@gomnang/domain/demo-data.ts'
import { createApp } from '../src/app.ts'
import { openDb } from '../src/db/client.ts'
import { seedIfEmpty } from '../src/db/seed.ts'

/**
 * Test API qua HTTP thật: mở server ở cổng ngẫu nhiên, gọi bằng fetch như client thật sẽ gọi.
 * Database là PGlite trong RAM, nạp dữ liệu mẫu — mỗi lần chạy đều bắt đầu từ cùng một trạng thái.
 */

process.env.LOG_SILENT = '1'

const SECRET = new TextEncoder().encode('test-only-secret-long-enough-for-hs256-0123')
const TODAY = '2026-09-14'
const U = DEMO_IDS.users

async function startServer(dataDir: string | null) {
  const { db, close } = await openDb(dataDir)
  await seedIfEmpty(db)
  const app = createApp({ db, secret: SECRET, devLoginEnabled: true, today: () => TODAY })
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`

  async function call(method: string, path: string, opts: { token?: string; body?: unknown; raw?: string } = {}) {
    const res = await fetch(base + path, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.raw ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
    })
    const text = await res.text()
    return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null }
  }

  async function login(email: string): Promise<string> {
    const res = await call('POST', '/api/auth/dev-login', { body: { email } })
    assert.equal(res.status, 200)
    return res.body.token
  }

  async function stop() {
    server.close()
    server.closeAllConnections()
    await close()
  }

  return { db, call, login, stop }
}

function projectBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Phát 100 phần cơm cho mái ấm Hoa Mai',
    goal: 'Nấu và phát 100 phần cơm cho trẻ em tại mái ấm vào cuối tháng.',
    beneficiaryGroup: 'Trẻ em tại mái ấm',
    location: 'Phường Linh Trung, TP. Thủ Đức',
    startDate: '2026-09-30',
    endDate: '2026-09-30',
    treasurerId: U.mai,
    needItems: [
      { label: 'Cơm', unit: 'phần', kind: 'goods', targetQty: 100 },
      { label: 'Tiền gas', unit: 'nghìn đồng', kind: 'money', targetQty: 500 },
    ],
    ...overrides,
  }
}

/** drizzle bọc lỗi của PostgreSQL trong `cause`, nên gom cả hai lớp message lại để so. */
const dbErrorMatching = (pattern: RegExp) => (err: unknown) => {
  const e = err as { message?: string; cause?: { message?: string } }
  assert.match(`${e.message} ${e.cause?.message}`, pattern)
  return true
}

describe('API GOM NẮNG', () => {
  let s: Awaited<ReturnType<typeof startServer>>
  let khanh: string
  let an: string
  let tam: string

  before(async () => {
    s = await startServer(null)
    khanh = await s.login('khanh@gomnang.test')
    an = await s.login('an@gomnang.test')
    tam = await s.login('tam@gomnang.test')
  })
  after(() => s.stop())

  test('GET /health → 200 và database sống', async () => {
    const res = await s.call('GET', '/health')
    assert.equal(res.status, 200)
    assert.equal(res.body.status, 'ok')
    assert.equal(res.body.db, 'ok')
  })

  test('tạo dự án khi chưa đăng nhập → 401', async () => {
    const res = await s.call('POST', '/api/projects', { body: projectBody() })
    assert.equal(res.status, 401)
    assert.equal(res.body.error.code, 'AUTH_REQUIRED')
  })

  test('token giả → 401', async () => {
    const res = await s.call('GET', '/api/users', { token: 'eyJhbGciOiJub25lIn0.e30.' })
    assert.equal(res.status, 401)
    assert.equal(res.body.error.code, 'INVALID_TOKEN')
  })

  test('HỢP LỆ: tạo dự án → 201, là bản nháp, có một dòng sổ ghi vết', async () => {
    const res = await s.call('POST', '/api/projects', { token: khanh, body: projectBody() })
    assert.equal(res.status, 201)
    assert.equal(res.body.status, 'draft')
    assert.equal(res.body.coordinator.id, U.khanh)
    assert.match(res.headers.get('location') ?? '', new RegExp(`/api/projects/${res.body.id}$`))
    assert.equal(res.body.auditLog.length, 1)
  })

  test('KHÔNG HỢP LỆ: sai kiểu dữ liệu → 400 và chỉ đúng trường sai', async () => {
    const body = projectBody({ needItems: [{ label: 'Cơm', unit: 'phần', kind: 'goods', targetQty: 'một trăm' }] })
    const res = await s.call('POST', '/api/projects', { token: khanh, body })
    assert.equal(res.status, 400)
    assert.equal(res.body.error.code, 'BAD_REQUEST')
    assert.ok('needItems.0.targetQty' in res.body.error.details)
  })

  test('KHÔNG HỢP LỆ: body không phải JSON → 400', async () => {
    const res = await s.call('POST', '/api/projects', { token: khanh, raw: '{"name": ' })
    assert.equal(res.status, 400)
    assert.equal(res.body.error.code, 'MALFORMED_JSON')
  })

  test('KHÔNG HỢP LỆ: BR-003 người phụ trách tài chính trùng người điều phối → 422', async () => {
    const res = await s.call('POST', '/api/projects', { token: khanh, body: projectBody({ treasurerId: U.khanh }) })
    assert.equal(res.status, 422)
    assert.equal(res.body.error.code, 'VALIDATION_FAILED')
    assert.match(res.body.error.details.treasurerId, /BR-003/)
  })

  test('KHÔNG HỢP LỆ: BR-002 người phụ trách tài chính chưa xác minh → 422', async () => {
    const res = await s.call('POST', '/api/projects', { token: khanh, body: projectBody({ treasurerId: U.hung }) })
    assert.equal(res.status, 422)
    assert.match(res.body.error.details.treasurerId, /xác minh/)
  })

  test('không mạo danh được người điều phối bằng cách tự gửi coordinatorId', async () => {
    const res = await s.call('POST', '/api/projects', { token: khanh, body: { ...projectBody(), coordinatorId: U.an } })
    assert.equal(res.status, 201)
    assert.equal(res.body.coordinator.id, U.khanh)
  })

  test('bản nháp bị ẩn với khách và người ngoài → 404, người điều phối vẫn xem được', async () => {
    const created = await s.call('POST', '/api/projects', { token: khanh, body: projectBody() })
    const path = `/api/projects/${created.body.id}`
    assert.equal((await s.call('GET', path)).status, 404)
    assert.equal((await s.call('GET', path, { token: an })).status, 404)
    assert.equal((await s.call('GET', path, { token: khanh })).status, 200)
  })

  test('luồng đầy đủ: tạo → gửi xác minh → duyệt → cam kết → bàn giao → xác nhận', async () => {
    const created = await s.call('POST', '/api/projects', { token: khanh, body: projectBody() })
    const id = created.body.id
    const riceId = created.body.needs[0].id

    const submitted = await s.call('POST', `/api/projects/${id}/submit`, { token: khanh })
    assert.equal(submitted.status, 200)
    assert.equal(submitted.body.status, 'pending_verification')
    // Tên gần trùng dự án mẫu "100 phần cơm cho mái ấm Hoa Mai" → người gác cổng gắn cờ.
    assert.equal(submitted.body.latestAssessment.verdict, 'FLAG')
    assert.equal(submitted.body.latestAssessment.similarProjects[0].id, DEMO_IDS.projects.hoaMai)

    assert.equal((await s.call('POST', `/api/projects/${id}/submit`, { token: khanh })).status, 409)

    const publicList = await s.call('GET', '/api/projects')
    assert.ok(!publicList.body.some((p: { id: string }) => p.id === id), 'dự án chờ xác minh không được hiện công khai')

    const notVerifier = await s.call('POST', `/api/projects/${id}/review`, { token: khanh, body: { decision: 'approve' } })
    assert.equal(notVerifier.status, 403)
    assert.equal(notVerifier.body.error.code, 'NOT_VERIFIER')

    const queue = await s.call('GET', '/api/verification-queue', { token: tam })
    assert.ok(queue.body.some((p: { id: string }) => p.id === id))

    const noReason = await s.call('POST', `/api/projects/${id}/review`, { token: tam, body: { decision: 'reject' } })
    assert.equal(noReason.status, 422)
    assert.equal(noReason.body.error.code, 'REASON_REQUIRED')

    const approved = await s.call('POST', `/api/projects/${id}/review`, { token: tam, body: { decision: 'approve' } })
    assert.equal(approved.body.status, 'published')

    const committed = await s.call('POST', `/api/projects/${id}/contributions`, {
      token: an,
      body: { needItemId: riceId, quantity: 30 },
    })
    assert.equal(committed.status, 201)
    assert.equal(committed.body.status, 'committed')
    const contributionId = committed.body.id

    const tooMuch = await s.call('POST', `/api/projects/${id}/contributions`, {
      token: an,
      body: { needItemId: riceId, quantity: 71 },
    })
    assert.equal(tooMuch.status, 422)
    assert.equal(tooMuch.body.error.code, 'EXCEEDS_REMAINING')

    const transition = (token: string, to: string) =>
      s.call('POST', `/api/contributions/${contributionId}/transition`, { token, body: { to } })

    assert.equal((await transition(an, 'delivered')).status, 200)

    const selfConfirm = await transition(an, 'confirmed')
    assert.equal(selfConfirm.status, 403)
    assert.equal(selfConfirm.body.error.code, 'SELF_CONFIRMATION')

    const confirmed = await transition(khanh, 'confirmed')
    assert.equal(confirmed.status, 200)
    assert.equal(confirmed.body.status, 'confirmed')

    const detail = await s.call('GET', `/api/projects/${id}`)
    const rice = detail.body.needs.find((n: { id: string }) => n.id === riceId)
    assert.deepEqual([rice.committedQty, rice.deliveredQty, rice.confirmedQty], [30, 30, 30])
    assert.deepEqual(
      detail.body.auditLog.map((a: { toState: string }) => a.toState),
      ['draft', 'pending_verification', 'published', 'committed', 'delivered', 'confirmed'],
    )
  })

  test('người xác minh không được duyệt dự án mà chính mình điều phối → 403', async () => {
    const created = await s.call('POST', '/api/projects', {
      token: tam,
      body: projectBody({
        name: 'Góc sách cộng đồng tổ dân phố 3',
        treasurerId: null,
        needItems: [{ label: 'Sách', unit: 'cuốn', kind: 'goods', targetQty: 50 }],
      }),
    })
    const id = created.body.id
    assert.equal((await s.call('POST', `/api/projects/${id}/submit`, { token: tam })).status, 200)

    const res = await s.call('POST', `/api/projects/${id}/review`, { token: tam, body: { decision: 'approve' } })
    assert.equal(res.status, 403)
    assert.equal(res.body.error.code, 'CONFLICT_OF_INTEREST')
  })

  test('sổ ghi vết không sửa, không xoá được — kể cả bằng SQL chạy thẳng vào database', async () => {
    await assert.rejects(s.db.execute(sql`update audit_log set to_state = 'published'`), dbErrorMatching(/append-only/))
    await assert.rejects(s.db.execute(sql`delete from audit_log`), dbErrorMatching(/append-only/))
  })

  test('database tự chặn BR-003 kể cả khi code quên kiểm', async () => {
    const hoaMai = DEMO_IDS.projects.hoaMai
    await assert.rejects(
      s.db.execute(sql`update projects set treasurer_id = coordinator_id where id = ${hoaMai}`),
      dbErrorMatching(/projects_treasurer_not_coordinator/),
    )
  })

  test('endpoint không tồn tại → 404', async () => {
    const res = await s.call('GET', '/api/khong-co')
    assert.equal(res.status, 404)
    assert.equal(res.body.error.code, 'NOT_FOUND')
  })
})

describe('dữ liệu bền vững', () => {
  test('tắt server rồi bật lại trên cùng thư mục dữ liệu → dự án vừa tạo vẫn còn', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gomnang-api-'))
    try {
      const first = await startServer(dir)
      const created = await first.call('POST', '/api/projects', {
        token: await first.login('khanh@gomnang.test'),
        body: projectBody({ name: 'Dự án kiểm tra lưu bền' }),
      })
      assert.equal(created.status, 201)
      await first.stop()

      const second = await startServer(dir)
      const reloaded = await second.call('GET', `/api/projects/${created.body.id}`, {
        token: await second.login('khanh@gomnang.test'),
      })
      assert.equal(reloaded.status, 200)
      assert.equal(reloaded.body.name, 'Dự án kiểm tra lưu bền')
      await second.stop()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
