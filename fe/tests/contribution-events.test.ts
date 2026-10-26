import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readContributionEvents, waitForReconnect } from '../src/libs/api/contribution-events.ts'
import { createHttpClient } from '../src/libs/api/client.ts'

function stream(text: string) {
  const bytes = new TextEncoder().encode(text)
  return new Response(new ReadableStream({
    start(controller) { for (const byte of bytes) controller.enqueue(Uint8Array.of(byte)); controller.close() },
  }), { headers: { 'content-type': 'text/event-stream' } })
}
test('SSE handles split UTF-8/CRLF frames and multiple events without replaying incomplete frames', async () => {
  const events: string[] = []
  await readContributionEvents(stream(': giữ kết nối\r\n\r\nevent: ready\r\ndata: {"projectId":"p"}\r\n\r\nevent: contributions-changed\ndata: {"projectId":"p"}\n\nevent: ready'), 'p', (e) => events.push(e))
  assert.deepEqual(events, ['ready', 'contributions-changed'])
})
test('SSE distinguishes access loss, wrong project, bad response and rotation', async () => {
  for (const [event, status] of [['auth-required', 401], ['access-lost', 404]] as const) {
    await assert.rejects(readContributionEvents(stream(`event: ${event}\ndata: {"projectId":"p"}\n\n`), 'p', () => {}), { status })
  }
  await assert.rejects(readContributionEvents(stream('event: ready\ndata: {"projectId":"other"}\n\n'), 'p', () => {}), { status: 502 })
  await assert.rejects(readContributionEvents(new Response('{}'), 'p', () => {}), { status: 502 })
  await readContributionEvents(stream('event: reconnect\ndata: {"projectId":"p"}\n\n'), 'p', () => assert.fail('rotation is control only'))
})
test('caller abort cancels JSON snapshot and reconnect delay without expiring session', async () => {
  const abort = new AbortController()
  let expired = false
  const client = createHttpClient({
    session: { read: () => ({ token: 'test', revision: 1 }), expire: () => { expired = true } },
    fetchImpl: async (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
    }),
  })
  const result = client('/api/projects/p', { signal: abort.signal })
  const pause = waitForReconnect(60_000, abort.signal)
  abort.abort()
  await assert.rejects(result, { name: 'AbortError' })
  await pause
  assert.equal(expired, false)
})
