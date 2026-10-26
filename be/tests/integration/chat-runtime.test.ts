import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { ChatDeadline, chatTimeout, normalizeChatFailure } from '../../src/modules/chat/chat.runtime.ts'
import { createOllamaChat } from '../../src/modules/chat/chat.model.ts'
import { createOllamaEmbedder } from '../../src/modules/chat/chat.embedding.ts'
import { readProviderJson } from '../../src/modules/chat/chat.transport.ts'

const timedOut = (error: unknown) => error instanceof Error && 'code' in error && error.code === 'CHAT_TIMEOUT'

test('shared budget expires during a step and does not start later work, while allowing bounded finalization', async () => {
  const deadline = new ChatDeadline(200, 150)
  try {
    await assert.rejects(deadline.run(() => delay(90)), timedOut)
    let started = false
    await assert.rejects(deadline.run(async () => { started = true }), timedOut)
    assert.equal(started, false)
    await deadline.run(async () => 'metadata saved', true)
  } finally { deadline.dispose() }
})

test('provider headers are not completion: body read abort preserves timeout for chat and embedding', async () => {
  for (const adapter of ['ollama', 'embedding'] as const) {
    const controller = new AbortController()
    let cancelled = false
    const fetchImpl: typeof fetch = async () => new Response(new ReadableStream<Uint8Array>({
      start(stream) { stream.enqueue(new TextEncoder().encode('{')) },
      cancel() { cancelled = true },
    }))
    const promise = adapter === 'ollama' ? createOllamaChat('http://fixture', 'fixture', fetchImpl).complete([], { signal: controller.signal })
      : createOllamaEmbedder('http://fixture', 'fixture', fetchImpl).embedQuery('question', { signal: controller.signal })
    const rejected = assert.rejects(promise, timedOut)
    await delay(1)
    controller.abort(chatTimeout())
    await rejected
    assert.equal(cancelled, true)
  }
})

test('provider JSON rejects excessive bytes and malformed bodies without exposing their content', async () => {
  const signal = new AbortController().signal
  await assert.rejects(readProviderJson(new Response('123456789'), signal, 5),
    (error: unknown) => error instanceof Error && 'code' in error && error.code === 'CHAT_RESPONSE_TOO_LARGE')
  await assert.rejects(readProviderJson(new Response('not json'), signal),
    (error: unknown) => error instanceof Error && 'code' in error && error.code === 'CHAT_PROVIDER_JSON_INVALID')
  assert.equal(normalizeChatFailure({ cause: { code: '57014' } }).status, 504)
  assert.equal(normalizeChatFailure({ cause: { code: 'ECONNRESET' } }).status, 503)
})
