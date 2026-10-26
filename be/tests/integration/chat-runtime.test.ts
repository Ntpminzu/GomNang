import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { createChatTimeout, chatTimeout, normalizeChatFailure, withAbort } from '../../src/modules/chat/chat.runtime.ts'
import { createOllamaChat } from '../../src/modules/chat/chat.model.ts'
import { createOllamaEmbedder } from '../../src/modules/chat/chat.embedding.ts'
import { providerSignal, readProviderJson } from '../../src/modules/chat/chat.transport.ts'

const timedOut = (error: unknown) => error instanceof Error && 'code' in error && error.code === 'CHAT_TIMEOUT'

test('one shared timeout stops waiting and prevents later work', async () => {
  const timeout = createChatTimeout(20)
  try {
    assert.equal(providerSignal(timeout.signal), timeout.signal)
    await assert.rejects(withAbort(timeout.signal, () => delay(90)), timedOut)
    let started = false
    await assert.rejects(withAbort(timeout.signal, async () => { started = true }), timedOut)
    assert.equal(started, false)
  } finally { timeout.dispose() }
})

test('closing a chat cancels pending work and clears its timer', async () => {
  const timeout = createChatTimeout(100)
  const pending = withAbort(timeout.signal, () => delay(50))
  const rejected = assert.rejects(pending,
    (error: unknown) => error instanceof Error && 'code' in error && error.code === 'CHAT_CANCELLED')
  timeout.dispose()
  await rejected
  await delay(110)
  assert.equal(timeout.signal.reason.code, 'CHAT_CANCELLED')
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
