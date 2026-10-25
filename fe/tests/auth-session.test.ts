import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import type { SessionUser } from '@gomnang/domain/types.ts'
const originalFetch = globalThis.fetch
let handler: typeof fetch = async () => { throw new Error('unexpected network') }
globalThis.fetch = (input, init) => handler(input, init)
const storage = new Map<string, string>()
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
} })
const session = await import('../src/libs/session/index.ts')
const { createHttpClient } = await import('../src/libs/api/client.ts')
const httpAuth = await import('../src/libs/api/http/auth.ts')
after(() => { globalThis.fetch = originalFetch })
const account = (id: string): SessionUser => ({ id, name: id, email: id + '@session.test', role: 'user', identityVerified: false })
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
function deferred() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((r) => { resolve = r })
  return { promise, resolve }
}
async function fresh() {
  return await import('../src/libs/session/index.ts?case=' + crypto.randomUUID()) as typeof session
}
test('401 expires only the token actually sent; DB 5xx keeps session', async () => {
  for (const status of [401, 503]) {
    let expired = 0
    const client = createHttpClient({
      fetchImpl: async () => json({ error: { code: 'TEST', message: 'test' } }, status),
      session: { read: () => ({ token: 'old', revision: 1 }), expire: () => { expired++ } },
    })
    await assert.rejects(() => client('/api/private'))
    assert.equal(expired, status === 401 ? 1 : 0)
  }
})
test('old 401 or successful response cannot overwrite a newer identity', async () => {
  const pending = deferred()
  let revision = 1, expired = 0
  const client = createHttpClient({ fetchImpl: async () => pending.promise,
    session: { read: () => ({ token: 'token', revision }), expire: () => { expired++ } } })
  const request = client('/api/private')
  revision = 2
  pending.resolve(json({ error: { code: 'INVALID_TOKEN' } }, 401))
  await assert.rejects(request, (err: unknown) => (err as { code: string }).code === 'SESSION_CHANGED')
  assert.equal(expired, 0)
})
test('bootstrap ignores cached role until backend validates; network failure preserves stored token', async () => {
  storage.clear()
  storage.set('gomnang.httpSession.v1', JSON.stringify({ token: 'cached', user: { ...account('a'), role: 'admin' } }))
  const s = await fresh(), pending = deferred()
  handler = async () => pending.promise
  const boot = s.initializeSession()
  assert.equal(s.getSessionSnapshot().ready, false)
  assert.equal(s.getSessionSnapshot().user, null)
  pending.resolve(json({ user: account('a') }))
  await boot
  assert.equal(s.getSessionSnapshot().user?.role, 'user')
  const failed = await fresh()
  handler = async () => json({ error: { code: 'DB_DOWN' } }, 503)
  await failed.initializeSession()
  assert.equal(failed.getSessionSnapshot().ready, false)
  assert.equal(failed.getSessionSnapshot().error?.status, 503)
  assert.ok(storage.get('gomnang.httpSession.v1')?.includes('cached'))
})
test('pending bootstrap 401 does not erase callback login B', async () => {
  storage.set('gomnang.httpSession.v1', JSON.stringify({ token: 'old-a' }))
  const s = await fresh(), pending = deferred()
  handler = async () => pending.promise
  const boot = s.initializeSession()
  const revision = s.beginAuthentication()
  s.saveSessionIfCurrent(revision, account('b'), 'token-b')
  pending.resolve(json({ error: { code: 'INVALID_TOKEN' } }, 401))
  await boot
  assert.equal(s.getSessionSnapshot().user?.id, 'b')
  assert.equal(s.getSessionSnapshot().token, 'token-b')
})
test('OAuth StrictMode duplicate completions share one request; logout invalidates cached success', async () => {
  session.saveSession(null)
  let completes = 0
  handler = async () => { completes++; return json({ status: 'authenticated', token: 'google-token', user: account('google'), next: '/' }) }
  const [one, two] = await Promise.all([httpAuth.completeGoogleOnce(), httpAuth.completeGoogleOnce()])
  assert.deepEqual(one, two); assert.equal(completes, 1)
  const revision = session.getSessionSnapshot().revision
  await httpAuth.completeGoogleOnce()
  assert.equal(session.getSessionSnapshot().revision, revision)
  handler = async () => new Response(null, { status: 204 })
  await httpAuth.logout()
  assert.equal(session.getSessionSnapshot().user, null)
  handler = async () => json({ error: { code: 'OAUTH_FLOW_EXPIRED', message: 'restart' } }, 410)
  await assert.rejects(() => httpAuth.completeGoogleOnce())
  assert.equal(session.getSessionSnapshot().user, null)
})
test('logout A resolving after login B does not clear B; network failure keeps A', async () => {
  session.saveSession(account('a'), 'token-a')
  handler = async () => { throw new Error('network unavailable') }
  await assert.rejects(() => httpAuth.logout())
  assert.equal(session.getSessionSnapshot().user?.id, 'a')
  const pending = deferred()
  handler = async () => pending.promise
  const logout = httpAuth.logout()
  session.saveSession(account('b'), 'token-b')
  pending.resolve(new Response(null, { status: 204 }))
  await assert.rejects(logout)
  assert.equal(session.getSessionSnapshot().user?.id, 'b')
})
test('public auth options survive concurrent session initialization', async () => {
  const pending = deferred()
  handler = async () => pending.promise
  const options = httpAuth.authOptions()
  session.saveSession(null)
  pending.resolve(json({ googleEnabled: true, devLoginEnabled: false }))
  assert.equal((await options).googleEnabled, true)
})
