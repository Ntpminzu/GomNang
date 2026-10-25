import assert from 'node:assert/strict'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { before, after, test } from 'node:test'
import { eq, sql } from 'drizzle-orm'
import { hashSync } from 'bcryptjs'
import { SignJWT, generateKeyPair } from 'jose'
import { createApp } from '../../src/app.ts'
import { openDb } from '../../src/infrastructure/database/client.ts'
import { users, authSessions, oauthIdentities } from '../../src/infrastructure/database/schema.ts'
import { bootstrapAdmin } from '../../scripts/bootstrap-admin.ts'
import { loadConfig } from '../../src/config/env.ts'
import { verifyGoogleIdToken, createGoogleClient, type GoogleProfile } from '../../src/modules/auth/auth.oauth.ts'
import { OAuthStateStore } from '../../src/modules/auth/auth.oauth-state.ts'
import { authenticate } from '../../src/modules/auth/auth.service.ts'
import * as repository from '../../src/modules/auth/auth.repository.ts'
import type { AuthDeps } from '../../src/modules/auth/auth.types.ts'
import { fixtureEmbedder } from '../helpers/chat-fixture.ts'
import { completeGoogle } from '../../src/modules/auth/auth.oauth.service.ts'
import { errorHandler } from '../../src/common/middleware/error-handler.ts'

process.env.LOG_SILENT = '1'
const SECRET = new TextEncoder().encode('us1-test-only-secret-0123456789abcdef')
const PASSWORD = 'Initial-test-password1'
const NEW_PASSWORD = 'Private-verifier-password2'
const ORIGIN = 'http://localhost:3000'
let opened: Awaited<ReturnType<typeof openDb>>
let server: ReturnType<ReturnType<typeof createApp>['listen']>
let base = ''
let adminToken = ''
const profiles = new Map<string, GoogleProfile>()
const calls: string[] = []

async function call(method: string, path: string, options: { token?: string; body?: unknown; cookie?: string; origin?: string } = {}) {
  const response = await fetch(base + path, {
    method, redirect: 'manual',
    headers: { 'content-type': 'application/json', ...(options.token ? { authorization: 'Bearer ' + options.token } : {}), ...(options.cookie ? { cookie: options.cookie } : {}), ...(options.origin ? { origin: options.origin } : {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()
  return { status: response.status, body: text && response.headers.get('content-type')?.includes('json') ? JSON.parse(text) : null, headers: response.headers }
}
async function passwordLogin(email: string, password = PASSWORD) {
  return call('POST', '/api/auth/login', { body: { email, password } })
}
async function googleFlow(email: string, subject = email, next = '/') {
  const code = crypto.randomUUID()
  profiles.set(code, { subject, email, name: 'Google Test User' })
  const started = await call('GET', '/api/auth/google/start?next=' + encodeURIComponent(next))
  const location = new URL(started.headers.get('location')!)
  const cookie = started.headers.get('set-cookie')!.split(';')[0]
  const callback = await call('GET', '/api/auth/google/callback?state=' + location.searchParams.get('state') + '&code=' + code, { cookie })
  assert.equal(callback.headers.get('location'), ORIGIN + '/auth/callback?status=ready')
  return { cookie, state: location.searchParams.get('state')!, code }
}
async function createVerifier(email: string) {
  return call('POST', '/api/admin/verifiers', { token: adminToken, body: { name: 'Verifier Test', email, password: PASSWORD, confirmPassword: PASSWORD } })
}
before(async () => {
  opened = await openDb(null)
  await bootstrapAdmin(opened.db, { email: 'admin@us1.test', name: 'Admin Test', password: PASSWORD }, true)
  server = createApp({
    db: opened.db, secret: SECRET, devLoginEnabled: true, today: () => '2026-10-25',
    chatModels: { ollama: { name: 'test', client: null }, gemini: { name: 'test', client: null } },
    chatEmbedder: fixtureEmbedder,
    google: { origin: ORIGIN, client: {
      authorizationUrl({ state }) { return 'https://accounts.google.com/test?state=' + state },
      async exchange(code, verifier, nonce) { assert.ok(verifier && nonce); calls.push(code); const profile = profiles.get(code); if (!profile) throw new Error('fake provider failure'); return profile },
    } },
  }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port
  adminToken = (await passwordLogin('admin@us1.test')).body.token
})
after(async () => { server?.close(); server?.closeAllConnections(); await opened?.close() })

test('register fixes ordinary role; password/dev cannot escalate; current role comes from DB', async () => {
  const response = await call('POST', '/api/auth/register', { body: { name: 'Normal User', email: 'normal@us1.test', phone: '0901234567', password: PASSWORD, confirmPassword: PASSWORD, role: 'admin', identityVerified: true } })
  assert.equal(response.status, 201)
  assert.equal(response.body.user.role, 'user')
  assert.equal(response.body.user.identityVerified, false)
  const token = response.body.token
  assert.equal((await call('GET', '/api/admin/verifiers', { token })).status, 403)
  assert.equal((await call('POST', '/api/auth/dev-login', { body: { email: 'admin@us1.test' } })).status, 403)
  assert.equal((await passwordLogin('normal@us1.test', 'wrong')).status, 401)
  const signed = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(response.body.user.id).setIssuer('gomnang-api').setExpirationTime('1h').sign(SECRET)
  assert.equal((await call('GET', '/api/auth/me', { token: signed })).status, 401)
  await opened.db.update(users).set({ role: 'admin' }).where(eq(users.id, response.body.user.id))
  assert.equal((await call('GET', '/api/auth/me', { token })).body.user.role, 'admin')
})

test('admin creation rejects duplicate/casefold and role injection; list never leaks credentials', async () => {
  const response = await createVerifier('Verifier@us1.test')
  assert.equal(response.status, 201)
  assert.equal('mustChangePassword' in response.body, false)
  assert.equal((await createVerifier('VERIFIER@us1.test')).status, 409)
  const injected = await call('POST', '/api/admin/verifiers', { token: adminToken, body: { name: 'Injected', email: 'inject@us1.test', password: PASSWORD, confirmPassword: PASSWORD, role: 'admin' } })
  assert.equal(injected.status, 400)
  const listed = await call('GET', '/api/admin/verifiers', { token: adminToken })
  assert.equal(listed.status, 200)
  assert.ok(!JSON.stringify(listed.body).includes('passwordHash'))
  assert.ok(!JSON.stringify(listed.body).includes(PASSWORD))
  const [row] = await opened.db.select().from(users).where(eq(users.email, 'verifier@us1.test'))
  assert.equal(row.role, 'verifier'); assert.equal(row.identityVerified, false)
})

test('verifier can work immediately and voluntarily change password, revoking all old sessions', async () => {
  await createVerifier('first@us1.test')
  const first = await passwordLogin('first@us1.test'), second = await passwordLogin('first@us1.test')
  assert.equal('mustChangePassword' in first.body.user, false)
  const token = first.body.token
  assert.equal((await call('GET', '/api/users', { token })).status, 200)
  assert.equal((await call('GET', '/api/verification-queue', { token })).status, 200)
  assert.equal((await call('GET', '/api/admin/verifiers', { token })).status, 403)
  assert.equal((await call('GET', '/api/auth/me', { token })).status, 200)
  const wrong = await call('POST', '/api/auth/change-password', { token, body: { currentPassword: 'wrong', newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD } })
  assert.equal(wrong.status, 422)
  assert.equal((await call('GET', '/api/auth/me', { token })).status, 200)
  const same = await call('POST', '/api/auth/change-password', { token, body: { currentPassword: PASSWORD, newPassword: PASSWORD, confirmPassword: PASSWORD } })
  assert.equal(same.status, 422)
  const changed = await call('POST', '/api/auth/change-password', { token, body: { currentPassword: PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD } })
  assert.equal(changed.status, 200); assert.equal('mustChangePassword' in changed.body.user, false)
  for (const old of [token, second.body.token]) assert.equal((await call('GET', '/api/auth/me', { token: old })).status, 401)
  assert.equal((await passwordLogin('first@us1.test')).status, 401)
  assert.equal((await call('GET', '/api/verification-queue', { token: changed.body.token })).status, 200)
  assert.equal((await call('GET', '/api/admin/verifiers', { token: changed.body.token })).status, 403)
  assert.equal((await call('POST', '/api/auth/dev-login', { body: { email: 'first@us1.test' } })).status, 403)
})

test('concurrent voluntary password changes allow exactly one result; stale login never gains authority', async () => {
  await createVerifier('race@us1.test')
  const token = (await passwordLogin('race@us1.test')).body.token
  const changes = await Promise.all([1, 2].map(() => call('POST', '/api/auth/change-password', { token, body: { currentPassword: PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD } })))
  assert.equal(changes.filter((r) => r.status === 200).length, 1)
  assert.equal((await passwordLogin('race@us1.test')).status, 401)
})

test('logout revokes copied token only, other session survives; expired and malformed tokens fail', async () => {
  const a = await passwordLogin('admin@us1.test'), b = await passwordLogin('admin@us1.test')
  assert.equal((await call('POST', '/api/auth/logout', { token: a.body.token })).status, 204)
  assert.equal((await call('GET', '/api/auth/me', { token: a.body.token })).status, 401)
  assert.equal((await call('GET', '/api/auth/me', { token: b.body.token })).status, 200)
  assert.equal((await call('GET', '/api/users', { token: 'fake' })).status, 401)
  const row = await repository.findAccountByEmail(opened.db, 'admin@us1.test')
  await opened.db.update(authSessions).set({ expiresAt: new Date(0) }).where(eq(authSessions.userId, row!.id))
  assert.equal((await call('GET', '/api/auth/me', { token: b.body.token })).status, 401)
  adminToken = (await passwordLogin('admin@us1.test')).body.token
})

test('Google creates only ordinary user, same subject preserves ID, Origin/replay protections', async () => {
  const flow = await googleFlow('google@us1.test', 'google-sub', '//evil.example')
  assert.equal((await call('POST', '/api/auth/google/complete', { cookie: flow.cookie, origin: 'https://evil.example' })).status, 403)
  const result = await call('POST', '/api/auth/google/complete', { cookie: flow.cookie, origin: ORIGIN })
  assert.equal(result.status, 200); assert.equal(result.body.next, '/')
  assert.equal(result.body.user.role, 'user'); assert.equal(result.body.user.identityVerified, false)
  assert.equal((await call('POST', '/api/auth/google/complete', { cookie: flow.cookie, origin: ORIGIN })).status, 410)
  const next = await googleFlow('changed@us1.test', 'google-sub')
  const logged = await call('POST', '/api/auth/google/complete', { cookie: next.cookie, origin: ORIGIN })
  assert.equal(logged.body.user.id, result.body.user.id)
  assert.equal(logged.body.user.email, 'google@us1.test')
  const stateRejected = await call('GET', '/api/auth/google/callback?state=wrong&code=unknown', { cookie: next.cookie })
  assert.match(stateRejected.headers.get('location')!, /status=failed/)
  assert.ok(!calls.includes('unknown'))
})

test('Google email collision requires password proof and preserves old user; passwordless/privileged denied', async () => {
  const registered = await call('POST', '/api/auth/register', { body: { name: 'Old Account', email: 'old@us1.test', phone: '0901234567', password: PASSWORD, confirmPassword: PASSWORD } })
  const flow = await googleFlow('old@us1.test')
  const result = await call('POST', '/api/auth/google/complete', { cookie: flow.cookie, origin: ORIGIN })
  assert.equal(result.body.status, 'link_required'); assert.equal(result.body.token, undefined)
  assert.equal((await call('POST', '/api/auth/google/link-confirm', { cookie: flow.cookie, origin: ORIGIN, body: { password: 'wrong', confirm: true } })).status, 422)
  const linked = await call('POST', '/api/auth/google/link-confirm', { cookie: flow.cookie, origin: ORIGIN, body: { password: PASSWORD, confirm: true } })
  assert.equal(linked.body.user.id, registered.body.user.id)
  await opened.db.insert(users).values({ email: 'nopassword@us1.test', displayName: 'Old No Password' })
  for (const [email, expected] of [['nopassword@us1.test', 409], ['admin@us1.test', 403], ['verifier@us1.test', 403]] as const) {
    const attempt = await googleFlow(email)
    assert.equal((await call('POST', '/api/auth/google/complete', { cookie: attempt.cookie, origin: ORIGIN })).status, expected)
  }
  const [identity] = await opened.db.select().from(oauthIdentities).where(eq(oauthIdentities.userId, registered.body.user.id))
  await opened.db.update(users).set({ role: 'verifier' }).where(eq(users.id, registered.body.user.id))
  assert.equal((await call('GET', '/api/auth/me', { token: linked.body.token })).status, 401)
  const attempt = await googleFlow('old@us1.test', identity.subject)
  assert.equal((await call('POST', '/api/auth/google/complete', { cookie: attempt.cookie, origin: ORIGIN })).status, 403)
})

test('bootstrap preview never inserts; existing mixed-case email cannot be promoted', async () => {
  const before = await opened.db.select({ count: sql<number>`count(*)::int` }).from(users)
  const preview = await bootstrapAdmin(opened.db, { email: 'preview@us1.test', name: 'Preview' })
  assert.equal(preview.preview, true)
  assert.deepEqual(await opened.db.select({ count: sql<number>`count(*)::int` }).from(users), before)
  await opened.db.insert(users).values({ email: 'Mixed@us1.test', displayName: 'Mixed' })
  await assert.rejects(() => bootstrapAdmin(opened.db, { email: 'mixed@us1.test', name: 'Changed', password: PASSWORD }, true), (e: unknown) => (e as { code: string }).code === 'EMAIL_EXISTS')
  const row = await repository.findAccountByEmail(opened.db, 'mixed@us1.test')
  assert.equal(row?.role, 'user'); assert.equal(row?.passwordHash, null)
})

test('DB failure while verifying valid token propagates 5xx boundary rather than invalid-token 401', async () => {
  const deps = { db: opened.db, secret: SECRET, auth: { ...repository, async findSession() { throw new Error('simulated DB outage') } } } as unknown as AuthDeps
  await assert.rejects(() => authenticate('Bearer ' + adminToken, deps), /simulated DB outage/)
})

test('real JOSE verification rejects wrong nonce/audience/issuer/expiry/signature and unverified email', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256')
  const make = (override: Record<string, unknown> = {}) => new SignJWT({ sub: 'subject', email: 'real@us1.test', email_verified: true, nonce: 'nonce', iss: 'https://accounts.google.com', aud: 'client', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+60, ...override }).setProtectedHeader({ alg: 'RS256' }).sign(privateKey)
  const resolver = async () => publicKey
  assert.equal((await verifyGoogleIdToken(await make(), 'client', 'nonce', resolver)).subject, 'subject')
  for (const override of [{ nonce: 'bad' }, { aud: 'bad' }, { iss: 'bad' }, { exp: 1 }, { email_verified: false }]) {
    await assert.rejects(() => make(override).then((token) => verifyGoogleIdToken(token, 'client', 'nonce', resolver)))
  }
  const other = await generateKeyPair('RS256')
  await assert.rejects(() => make().then((token) => verifyGoogleIdToken(token, 'client', 'nonce', async () => other.publicKey)))
  const client = createGoogleClient({ origin: ORIGIN, clientId: 'client', clientSecret: 'not-real' })
  const url = new URL(client.authorizationUrl({ verifier: 'test-verifier', nonce: 'nonce', state: 'state' }))
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(url.searchParams.get('redirect_uri'), ORIGIN + '/api/auth/google/callback')
})

test('flow TTL and atomic claim; partial Google config rejected; production dev login forced off', () => {
  let time = 0
  const store = new OAuthStateStore(() => time), flow = store.start('/')
  store.callback(flow.id, flow.state)
  assert.throws(() => store.callback(flow.id, flow.state))
  time = 300_001
  assert.throws(() => store.get(flow.id))
  assert.throws(() => loadConfig({ JWT_SECRET: 'long-enough-test-secret-01234567890', GOOGLE_CLIENT_ID: 'partial' }))
  assert.equal(loadConfig({ NODE_ENV: 'production', JWT_SECRET: 'long-enough-test-secret-01234567890', ENABLE_DEV_LOGIN: 'true' }).devLoginEnabled, false)
})

test('concurrent verifier creation commits one account and never changes an existing password', async () => {
  const results = await Promise.all([createVerifier('duplicate@us1.test'), createVerifier('DUPLICATE@us1.test')])
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409])
  const row = await repository.findAccountByEmail(opened.db, 'duplicate@us1.test')
  assert.equal(row?.role, 'verifier')
  assert.equal((await opened.db.select().from(users).where(sql`lower(${users.email}) = 'duplicate@us1.test'`)).length, 1)
})

test('temporary-password login racing password change cannot leave a usable old session', async () => {
  await createVerifier('login-race@us1.test')
  const token = (await passwordLogin('login-race@us1.test')).body.token
  const [login, changed] = await Promise.all([
    passwordLogin('login-race@us1.test'),
    call('POST', '/api/auth/change-password', { token, body: { currentPassword: PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD } }),
  ])
  assert.equal(changed.status, 200)
  if (login.status === 200) assert.equal((await call('GET', '/api/auth/me', { token: login.body.token })).status, 401)
  else assert.equal(login.status, 401)
  assert.equal((await passwordLogin('login-race@us1.test')).status, 401)
  assert.equal((await call('GET', '/api/auth/me', { token: changed.body.token })).status, 200)
})

test('Google cancellation differs from provider failure and five failed link proofs consume the flow', async () => {
  for (const [providerError, expected] of [['access_denied', 'cancelled'], ['server_error', 'failed']]) {
    const start = await call('GET', '/api/auth/google/start')
    const state = new URL(start.headers.get('location')!).searchParams.get('state')
    const cookie = start.headers.get('set-cookie')!.split(';')[0]
    const callback = await call('GET', `/api/auth/google/callback?state=${state}&error=${providerError}`, { cookie })
    assert.equal(callback.headers.get('location'), ORIGIN + '/auth/callback?status=' + expected)
    assert.equal((await call('POST', '/api/auth/google/complete', { cookie, origin: ORIGIN })).status, 410)
  }
  await call('POST', '/api/auth/register', { body: { name: 'Link Attempts', email: 'attempts@us1.test', phone: '0901234567', password: PASSWORD, confirmPassword: PASSWORD } })
  const { cookie } = await googleFlow('attempts@us1.test')
  assert.equal((await call('POST', '/api/auth/google/complete', { cookie, origin: ORIGIN })).body.status, 'link_required')
  for (let i = 0; i < 5; i++) assert.equal((await call('POST', '/api/auth/google/link-confirm', { cookie, origin: ORIGIN, body: { password: 'wrong', confirm: true } })).status, 422)
  assert.equal((await call('POST', '/api/auth/google/link-confirm', { cookie, origin: ORIGIN, body: { password: PASSWORD, confirm: true } })).status, 410)
})

test('Google user and identity writes roll back when issuing its session fails', async () => {
  const deps = { db: opened.db, secret: SECRET, auth: { ...repository, async insertSession() { throw new Error('simulated session write failure') } } } as unknown as AuthDeps
  await assert.rejects(() => completeGoogle({ subject: 'rollback-subject', email: 'rollback@us1.test', name: 'Rollback' }, deps), /simulated session write failure/)
  assert.equal(await repository.findAccountByEmail(opened.db, 'rollback@us1.test'), null)
  assert.equal(await repository.findIdentity(opened.db, 'rollback-subject'), null)
})

test('unexpected credential DB error logs only safe metadata, never SQL parameters or stack', () => {
  const previousSilent = process.env.LOG_SILENT, originalError = console.error
  const logs: string[] = [], responses: unknown[] = []
  process.env.LOG_SILENT = '0'
  console.error = (value) => { logs.push(String(value)) }
  try {
    const response = { locals: { requestId: 'test-safe-id' }, status(code: number) { assert.equal(code, 500); return this }, json(body: unknown) { responses.push(body); return this } }
    const err = new Error('Failed query params: SYNTHETIC_CREDENTIAL_HASH')
    errorHandler(err, {} as never, response as never, () => {})
    assert.ok(logs[0].includes('test-safe-id'))
    assert.ok(!JSON.stringify([logs, responses]).includes('SYNTHETIC_CREDENTIAL_HASH'))
  } finally { console.error = originalError; if (previousSilent === undefined) delete process.env.LOG_SILENT; else process.env.LOG_SILENT = previousSilent }
})
