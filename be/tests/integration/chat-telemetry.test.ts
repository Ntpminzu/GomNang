import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'
import type { Request, Response } from 'express'
import type { ChatDeps } from '../../src/modules/chat/chat.service.ts'
import { beginChatRequest, newChatRun, saveChatRequest } from '../../src/modules/chat/chat.telemetry.ts'
import { withAbort } from '../../src/modules/chat/chat.runtime.ts'
import { fixtureEmbedder } from '../helpers/chat-fixture.ts'

// Chỉ fake repository I/O; không mở DB hoặc nạp .env.
function fixture(fail = false) {
  const rows: Record<string, unknown>[] = []
  const db = { insert() { return { async values(row: Record<string, unknown>) {
    if (fail) throw new Error('fixture database failure with private content')
    rows.push(row)
  } } } } as unknown as ChatDeps['db']
  const deps: ChatDeps = { db, model: { name: 'fixture-qwen', client: null }, embedder: fixtureEmbedder }
  const response = Object.assign(new EventEmitter(), {
    locals: {} as Record<string, unknown>, writableFinished: true, statusCode: 200,
  })
  return { rows, deps, response }
}

test('chat writes no pending row and saves one metadata summary after response close', () => {
  const { rows, deps, response } = fixture()
  let nextCalled = false
  beginChatRequest(deps)({} as Request, response as unknown as Response, () => { nextCalled = true })
  assert.equal(nextCalled, true)
  assert.equal(rows.length, 0)
  response.locals.chatOutcome = { status: 'answered', reasonCode: 'RAG_ANSWERED' }
  response.emit('close')
  response.emit('close')
  assert.equal(rows.length, 1)
  assert.equal('lifecycle' in rows[0], false)
  assert.equal('embeddedDocuments' in rows[0], false)
  assert.equal('requestId' in rows[0] || 'id' in rows[0], false)
  assert.equal(rows[0].status, 'answered')
  assert.equal(rows[0].requestedModel, 'fixture-qwen')
  assert.equal(rows[0].embeddingTokens, null)
  assert.ok(rows[0].finishedAt instanceof Date)
  assert.equal('message' in rows[0] || 'history' in rows[0] || 'reply' in rows[0], false)
})

test('metadata saves measured embedding tokens including zero', async () => {
  const { deps, rows } = fixture()
  for (const tokens of [0, 7]) {
    const run = newChatRun(deps); run.embeddingTokens = tokens
    await saveChatRequest(deps, run, 'failed', 'CHAT_TIMEOUT', 504)
  }
  assert.deepEqual(rows.map((row) => row.embeddingTokens), [0, 7])
})

test('disconnect aborts pending chat work and saves a failed summary', async () => {
  const { rows, deps, response } = fixture()
  response.writableFinished = false
  beginChatRequest(deps)({} as Request, response as unknown as Response, () => {})
  const pending = withAbort(response.locals.chatSignal as AbortSignal, () => new Promise<void>(() => {}))
  const rejected = assert.rejects(pending,
    (error: unknown) => error instanceof Error && 'code' in error && error.code === 'CHAT_CANCELLED')
  response.emit('close')
  await rejected
  assert.equal(rows[0].status, 'failed')
  assert.equal(rows[0].httpStatus, 499)
  assert.equal(rows[0].reasonCode, 'CHAT_CANCELLED')
})

test('metadata database failure does not reject the chat result or expose the database error', async (t) => {
  const { deps } = fixture(true)
  const errors: string[] = []
  t.mock.method(console, 'error', (line: string) => { errors.push(line) })
  await assert.doesNotReject(saveChatRequest(deps, newChatRun(deps), 'answered', 'RAG_ANSWERED', 200))
  assert.ok(errors.every((line) => !line.includes('private content')))
})
