/** Read-only PostgreSQL/driver smoke; never seeds or modifies application data. */
import assert from 'node:assert/strict'
import { openDb } from '../src/infrastructure/database/client.ts'
import { getAiUsage } from '../src/modules/admin/admin.repository.ts'
import { resolveAiUsageRange } from '../src/modules/admin/admin.service.ts'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_REQUIRED')
const opened = await openDb(null, process.env.DATABASE_URL)
try {
  const data = await getAiUsage(opened.db, resolveAiUsageRange({ period: '30d' }, new Date()))
  for (const value of Object.values(data.totals)) assert.equal(typeof value, 'number')
  for (const value of [...Object.values(data.latency), ...Object.values(data.tokens)]) {
    assert.ok(value === null || (typeof value === 'number' && Number.isFinite(value)))
  }
  assert.equal(data.totals.answered + data.totals.refused + data.totals.failed, data.totals.requests)
  assert.equal(data.totals.modelOrigin + data.totals.ruleOrigin + data.totals.unknownOrigin, data.totals.requests)
  assert.equal(data.byReason.reduce((total, item) => total + item.count, 0), data.totals.requests)
  assert.ok(data.recent.length <= 50)
  for (const item of data.recent) {
    for (const field of ['requestId','httpStatus','modelCalls','embeddingCalls','latencyMs'] as const) assert.equal(typeof item[field], 'number')
  }
  console.log(JSON.stringify({ status: 'passed', driver: 'pg', period: data.period, totals: data.totals,
    latency: data.latency, tokens: data.tokens, recentCount: data.recent.length }))
} finally { await opened.close() }
