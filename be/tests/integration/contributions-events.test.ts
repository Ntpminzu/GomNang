import assert from 'node:assert/strict'
import { EventEmitter, once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { DEMO_IDS } from '@gomnang/domain/demo-data.ts'
import type { ProjectDetail } from '@gomnang/domain/types.ts'
import { createApp } from '../../src/app.ts'
import { openDb } from '../../src/infrastructure/database/client.ts'
import { seedIfEmpty } from '../../src/infrastructure/database/seed.ts'
import { fixtureEmbedder } from '../helpers/chat-fixture.ts'
import { contributionEvents, createContributionEvents } from '../../src/modules/contributions/contributions.events.ts'
import type { ContributionsDeps } from '../../src/modules/contributions/contributions.types.ts'
import { assertCanViewContributions } from '../../src/modules/contributions/contributions.service.ts'
import type { Request, Response } from 'express'
process.env.LOG_SILENT = '1'

test('stream owns post-header failures, idle permission checks, rotation and cleanup', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] })
  for (const failure of ['permission', 'database', 'rotation', 'backpressure']) {
    let blocked = false, ended = false
    const frames: string[] = []
    const events = createContributionEvents()
    const deps = { events, projects: { async findProject() {
      if (blocked && failure === 'database') throw new Error('database unavailable')
      return { status: blocked && failure === 'permission' ? 'draft' : 'published' }
    } } } as unknown as ContributionsDeps
    const emitter = new EventEmitter()
    const response = Object.assign(emitter, {
      locals: { resourceId: 'project' }, destroyed: false,
      status() { return this }, set() { return this }, flushHeaders() {},
      write(frame: string) { frames.push(frame); return failure !== 'backpressure' },
      end() { ended = true; emitter.emit('close') },
    })
    await contributionEvents(deps, (_header, id) => assertCanViewContributions(deps, id, null))({ get: () => undefined } as unknown as Request, response as unknown as Response, () => {})
    blocked = true
    t.mock.timers.tick(failure === 'rotation' ? 60_000 : 15_000)
    await new Promise<void>((resolve) => setImmediate(resolve))
    assert.equal(ended, true)
    const output = frames.join('')
    if (failure === 'permission') assert.match(output, /event: access-lost/)
    if (failure === 'database') assert.doesNotMatch(output, /auth-required|access-lost/)
    if (failure === 'rotation') assert.match(output, /event: reconnect/)
    const before = frames.length
    events.publish('project')
    await new Promise<void>((resolve) => setImmediate(resolve))
    assert.equal(frames.length, before)
  }
})

test('event bus isolates projects/apps and failures; unsubscribe removes listener', () => {
  const first = createContributionEvents(), second = createContributionEvents()
  let received = 0
  first.subscribe('a', () => { throw new Error('broken reader') })
  const remove = first.subscribe('a', () => { received++ })
  first.publish('b'); second.publish('a')
  assert.equal(received, 0)
  first.publish('a'); assert.equal(received, 1)
  remove(); first.publish('a'); assert.equal(received, 1)
})

test('SSE HTTP: rights, post-commit transitions, rollback, project isolation, revocation and cancellation cascade', { timeout: 30_000 }, async () => {
  const opened = await openDb(null)
  await seedIfEmpty(opened.db)
  const server = createApp({ db: opened.db, secret: new TextEncoder().encode('events-test-only-0123456789abcdef'),
    devLoginEnabled: true, today: () => '2026-09-14', chatEmbedder: fixtureEmbedder, chatModel: { name: 'none', client: null },
  }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const controllers: AbortController[] = []
  const call = async (path: string, token?: string, body?: unknown) => {
    const response = await fetch(origin + path, { method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    })
    return { status: response.status, body: response.status === 204 ? { id: '', status: '', token: '' } : await response.json() as { id: string; status: string; token: string } }
  }
  const login = async (email: string) => (await call('/api/auth/dev-login', undefined, { email })).body.token as string
  const listen = async (id: string, token?: string) => {
    const controller = new AbortController(); controllers.push(controller)
    const response = await fetch(`${origin}/api/projects/${id}/contributions/events`, {
      headers: token ? { authorization: `Bearer ${token}` } : {}, signal: controller.signal,
    })
    assert.equal(response.status, 200)
    const reader = response.body!.getReader()
    let text = ''
    const read = (async () => {
      try { while (true) { const chunk = await reader.read(); if (chunk.done) break; text += new TextDecoder().decode(chunk.value) } }
      catch { /* Test intentionally aborts readers. */ }
      finally { reader.releaseLock() }
    })()
    const wait = async (pattern: string, count = 1) => {
      const deadline = Date.now() + 3_000
      while (text.split(pattern).length - 1 < count && Date.now() < deadline) await delay(10)
      assert.ok(text.split(pattern).length - 1 >= count, `missing ${pattern}: ${text}`)
    }
    await wait('event: ready')
    return { wait, count: () => text.split('event: contributions-changed').length - 1, close: async () => { controller.abort(); await read } }
  }
  try {
    const P = DEMO_IDS.projects, N = DEMO_IDS.needs
    const endpoint = `/api/projects/${P.hoaMai}/contributions`
    const an = await login('an@gomnang.test'), khanh = await login('khanh@gomnang.test')
    for (const [id, token, status] of [[P.boKenh, '', 404], [P.hoaMai, 'invalid', 401]] as const) {
      const result = await fetch(`${origin}/api/projects/${id}/contributions/events`, { headers: token ? { authorization: `Bearer ${token}` } : {} })
      assert.equal(result.status, status); await result.text()
    }
    const guest = await listen(P.hoaMai), other = await listen(P.sachGiaoKhoa), member = await listen(P.hoaMai, an)
    const created = await call(endpoint, an, { needItemId: N.com, quantity: 1 })
    assert.equal(created.status, 201)
    assert.equal(created.body.status, 'committed')
    await guest.wait('event: contributions-changed', 1)
    const transition = `/api/contributions/${created.body.id}/transition`
    assert.notEqual((await call(transition, an, { to: 'confirmed' })).status, 200)
    await delay(100); assert.equal(guest.count(), 1)
    assert.equal((await call(transition, an, { to: 'delivered', note: 'Đã bàn giao' })).status, 200)
    await guest.wait('event: contributions-changed', 2)
    assert.equal((await call(transition, khanh, { to: 'confirmed' })).status, 200)
    await guest.wait('event: contributions-changed', 3)
    const another = await call(endpoint, an, { needItemId: N.com, quantity: 1 })
    await guest.wait('event: contributions-changed', 4)
    assert.equal((await call(`/api/contributions/${another.body.id}/transition`, an, { to: 'cancelled', note: 'Không tham gia được' })).status, 200)
    await guest.wait('event: contributions-changed', 5)
    await call('/api/auth/logout', an)
    assert.equal((await call(`/api/projects/${P.hoaMai}/cancel`, khanh, { reason: 'Kiểm thử hủy dự án' })).status, 200)
    await guest.wait('event: contributions-changed', 6)
    await member.wait('event: auth-required')
    const detail = await (await fetch(`${origin}/api/projects/${P.hoaMai}`)).json() as ProjectDetail
    assert.ok(detail.contributions.some((c: { status: string }) => c.status === 'cancelled'))
    assert.ok(detail.auditLog.some((e) => e.reason?.includes('huỷ') || e.reason?.includes('hủy')))
    assert.equal(other.count(), 0)
    const before = guest.count(); await guest.close()
    assert.equal(guest.count(), before)
    await other.close(); await member.close()
  } finally {
    controllers.forEach((controller) => controller.abort())
    server.close(); server.closeAllConnections()
    await opened.close()
  }
})
