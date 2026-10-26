import assert from 'node:assert/strict'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { after, before, beforeEach, test } from 'node:test'
import { createApp } from '../../src/app.ts'
import { openDb } from '../../src/infrastructure/database/client.ts'
import { chatRequests, users } from '../../src/infrastructure/database/schema.ts'
import { hashSync } from 'bcryptjs'
import { resolveAiUsageRange } from '../../src/modules/admin/admin.service.ts'
import { getAiUsage } from '../../src/modules/admin/admin.repository.ts'
import type { AiUsage } from '@gomnang/domain/ai-usage.ts'
import { fixtureEmbedder } from '../helpers/chat-fixture.ts'

process.env.LOG_SILENT = '1'
const now = new Date('2026-10-26T05:00:00Z')
let opened: Awaited<ReturnType<typeof openDb>>
let server: ReturnType<ReturnType<typeof createApp>['listen']>
let base: string
const tokens: Record<string, string> = {}
before(async () => {
  opened = await openDb(null)
  await opened.db.insert(users).values(['admin', 'user', 'verifier'].map((role) => ({
    email: role + '@us9.test', displayName: role, role: role as 'admin' | 'user' | 'verifier',
    passwordHash: hashSync('US9-test-password1', 4),
  })))
  server = createApp({ db: opened.db, secret: new TextEncoder().encode('us9-only-secret-0123456789abcdef'),
    devLoginEnabled: false, today: () => '2026-10-26',
    chatModel: { name: 'fixture', client: null }, chatEmbedder: fixtureEmbedder,
  }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port
  for (const role of ['admin', 'user', 'verifier']) {
    const response = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: role + '@us9.test', password: 'US9-test-password1' }) })
    assert.equal(response.status, 200)
    tokens[role] = ((await response.json()) as { token: string }).token
  }
})
beforeEach(async () => { await opened.db.delete(chatRequests) })
after(async () => { server?.close(); server?.closeAllConnections(); await opened?.close() })
function row(values: Partial<typeof chatRequests.$inferInsert> = {}): typeof chatRequests.$inferInsert {
  return { embeddingModel: 'fixture', promptVersion: 'p1', queryPromptVersion: 'q1', status: 'answered',
    reasonCode: 'RAG_ANSWERED', httpStatus: 200, origin: 'model', modelCalls: 1, embeddingCalls: 1,
    startedAt: new Date('2026-10-26T01:00:00Z'), finishedAt: new Date('2026-10-26T01:00:01Z'), latencyMs: 100,
    ...values }
}
const range = () => resolveAiUsageRange({ period: '7d' }, now)
function api(query = '', role = 'admin') {
  return fetch(base + '/api/admin/ai-usage' + query, { headers: role ? { authorization: 'Bearer ' + tokens[role] } : {} })
}
test('range presets, Vietnamese inclusive dates, leap dates and exactly 92 days', () => {
  assert.equal(range().from, '2026-10-19T05:00:00.000Z')
  assert.deepEqual(resolveAiUsageRange({}, now), range())
  assert.equal(resolveAiUsageRange({ period: '24h' }, now).from, '2026-10-25T05:00:00.000Z')
  assert.equal(resolveAiUsageRange({ period: '30d' }, now).from, '2026-09-26T05:00:00.000Z')
  const dates = resolveAiUsageRange({ from: '2026-10-25', to: '2026-10-26' }, now)
  assert.equal(dates.from, '2026-10-24T17:00:00.000Z'); assert.equal(dates.to, now.toISOString())
  assert.equal(resolveAiUsageRange({ from: '2026-10-26', to: '2026-10-26' }, new Date('2026-10-25T18:00:00Z')).from, '2026-10-25T17:00:00.000Z')
  assert.doesNotThrow(() => resolveAiUsageRange({ from: '2024-02-29', to: '2024-02-29' }, now))
  assert.doesNotThrow(() => resolveAiUsageRange({ from: '2026-01-01', to: '2026-04-02' }, now))
})
test('strict query validation includes 93 days before clipping to now', async () => {
  const bad = [{ period: '' }, { period: ['7d', '24h'] }, { period: '1d' }, { unknown: 'x' },
    { from: '2026-10-01' }, { to: '2026-10-01' }, { period: '7d', from: '2026-10-01', to: '2026-10-02' },
    { from: '2026-02-30', to: '2026-03-01' }, { from: '2025-02-29', to: '2025-03-01' },
    { from: '2026-1-01', to: '2026-01-02' }, { from: '2026-10-02', to: '2026-10-01' },
    { from: '2026-10-27', to: '2026-10-27' }, { from: '2026-01-01', to: '2026-04-03' },
    { from: '2026-10-26', to: '2027-02-01' }]
  for (const query of bad) assert.throws(() => resolveAiUsageRange(query, now), { code: 'BAD_REQUEST', status: 400 })
  for (const query of ['?period=7d&period=24h', '?from=2026-02-30&to=2026-03-01', '?extra=1', '?period=']) {
    const response = await api(query); assert.equal(response.status, 400)
    const body = await response.json() as { error: { code: string; details?: unknown } }; assert.equal(body.error.code, 'BAD_REQUEST'); assert.ok(body.error.details)
  }
})
test('known totals, null/zero tokens, status/origin counts and call counts use their own denominators', async () => {
  await opened.db.insert(chatRequests).values([
    row({ totalTokens: 30, embeddingTokens: 5, latencyMs: 100 }),
    row({ status: 'refused', reasonCode: 'NO_EVIDENCE', origin: 'rule', modelCalls: 0, latencyMs: 200 }),
    row({ status: 'failed', reasonCode: 'OLLAMA_UNAVAILABLE', httpStatus: 503, origin: null,
      modelCalls: 2, embeddingCalls: 0, totalTokens: 0, embeddingTokens: 0, latencyMs: 300 }),
  ])
  const data = await getAiUsage(opened.db, range())
  assert.deepEqual(data.totals, { requests: 3, answered: 1, refused: 1, failed: 1,
    modelOrigin: 1, ruleOrigin: 1, unknownOrigin: 1, llmCalls: 3, embeddingCalls: 2 })
  assert.deepEqual(data.latency, { avgMs: 200, denominator: 3 })
  assert.deepEqual(data.tokens, { total: 30, totalDenominator: 2, avgTotalPerMeasuredRequest: 15,
    embedding: 5, embeddingDenominator: 2, avgEmbeddingPerMeasuredRequest: 2.5 })
  assert.equal(data.byReason.reduce((sum, item) => sum + item.count, 0), 3)
  assert.deepEqual(data.recent.map((item) => item.status), ['failed', 'refused', 'answered'])
})
test('empty is zero totals, unknown usage is null, and measured zero counts', async () => {
  const empty = await getAiUsage(opened.db, range())
  assert.equal(empty.totals.requests, 0); assert.equal(empty.tokens.total, 0); assert.equal(empty.tokens.embedding, 0)
  assert.equal(empty.latency.avgMs, null); assert.equal(empty.tokens.avgTotalPerMeasuredRequest, null)
  assert.deepEqual(empty.recent, []); assert.deepEqual(empty.byReason, [])
  await opened.db.insert(chatRequests).values(row())
  const unknown = await getAiUsage(opened.db, range())
  assert.equal(unknown.tokens.total, null); assert.equal(unknown.tokens.embedding, null)
  assert.equal(unknown.tokens.totalDenominator, 0); assert.equal(unknown.tokens.embeddingDenominator, 0)
  await opened.db.insert(chatRequests).values(row({ totalTokens: 0, embeddingTokens: 0 }))
  const zero = await getAiUsage(opened.db, range())
  assert.equal(zero.tokens.totalDenominator, 1); assert.equal(zero.tokens.avgTotalPerMeasuredRequest, 0)
})
test('half-open boundaries, recent 50 rows and deterministic sorting without private fields', async () => {
  const period = range()
  await opened.db.insert(chatRequests).values([
    row({ startedAt: new Date(period.from), reasonCode: 'AT_FROM' }),
    row({ startedAt: new Date(period.to), reasonCode: 'AT_TO' }),
    row({ startedAt: new Date(Date.parse(period.from) - 1), reasonCode: 'BEFORE' }),
    ...Array.from({ length: 51 }, () => row()),
  ])
  const data = await getAiUsage(opened.db, period)
  assert.equal(data.totals.requests, 52); assert.equal(data.recent.length, 50)
  assert.ok(data.byReason.some((item) => item.reasonCode === 'AT_FROM'))
  assert.ok(!data.byReason.some((item) => ['AT_TO', 'BEFORE'].includes(item.reasonCode)))
  assert.ok(data.recent.every((item, i) => !i || item.requestId < data.recent[i - 1].requestId))
  assert.deepEqual(Object.keys(data.recent[0]).sort(), ['requestId','startedAt','status','reasonCode','httpStatus','origin',
    'requestedModel','actualModel','embeddingModel','promptVersion','queryPromptVersion','modelCalls','embeddingCalls',
    'inputTokens','outputTokens','thinkingTokens','totalTokens','embeddingTokens','latencyMs'].sort())
})
test('API requires admin, returns no-store and JSON numbers/null', async () => {
  assert.equal((await api('', '')).status, 401)
  for (const role of ['user', 'verifier']) assert.equal((await api('', role)).status, 403)
  await opened.db.insert(chatRequests).values(row({ startedAt: new Date(Date.now() - 1000), totalTokens: 12 }))
  const response = await api(); assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store')
  const data = await response.json() as AiUsage
  assert.equal(data.totals.requests, 1); assert.equal(typeof data.tokens.total, 'number')
  assert.equal(typeof data.totals.llmCalls, 'number'); assert.equal(data.tokens.embedding, null)
})
test('database failure becomes a 500 without exposing database details', async (t) => {
  t.mock.method(opened.db, 'transaction', async () => { throw new Error('private database detail') })
  const response = await api()
  assert.equal(response.status, 500)
  assert.ok(!(await response.text()).includes('private database detail'))
})
