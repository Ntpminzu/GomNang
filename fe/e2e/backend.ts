/** Test-only server. Never imports a dotenv file or connects to DATABASE_URL. */
import assert from 'node:assert/strict'
import express from 'express'
import { eq } from 'drizzle-orm'
import { hashSync } from 'bcryptjs'
import { createApp } from '../../be/src/app.ts'
import { openDb } from '../../be/src/infrastructure/database/client.ts'
import { seedIfEmpty } from '../../be/src/infrastructure/database/seed.ts'
import { users } from '../../be/src/infrastructure/database/schema.ts'
import { bootstrapAdmin } from '../../be/scripts/bootstrap-admin.ts'
import { fixtureCompletion, fixtureEmbedder } from '../../be/tests/helpers/chat-fixture.ts'
import { buildChatChunks, createIndex } from '../../be/src/modules/chat/chat.retrieval.ts'
import { listPublicChatSources } from '../../be/src/modules/projects/projects.repository.ts'
import { HttpError } from '../../be/src/common/errors/http-error.ts'
import { E2E_PASSWORD } from './fixtures.ts'
const frontend = 'http://127.0.0.1:3100', backend = 'http://127.0.0.1:4100'
if (process.env.NODE_ENV !== 'test' || process.env.DATABASE_URL || !process.env.DATA_DIR) throw new Error('E2E isolation configuration rejected')
const opened = await openDb(process.env.DATA_DIR)
await seedIfEmpty(opened.db)
await createIndex(opened.db, fixtureEmbedder, buildChatChunks(await listPublicChatSources(opened.db)))
await opened.db.update(users).set({ passwordHash: hashSync(E2E_PASSWORD, 10) })
if (!(await opened.db.select({ id: users.id }).from(users).where(eq(users.email, 'admin@e2e.test')).limit(1)).length) {
  await bootstrapAdmin(opened.db, { email: 'admin@e2e.test', name: 'Admin E2E', password: E2E_PASSWORD }, true)
}
const pending = new Map<string, { verifier: string; nonce: string }>()
const codes = new Map<string, { verifier: string; nonce: string }>()
const app = express()
app.get('/__e2e/google', (req, res) => {
  const state = String(req.query.state), flow = pending.get(state)
  if (!flow) { res.status(400).end(); return }
  pending.delete(state)
  const code = crypto.randomUUID(); codes.set(code, flow)
  res.redirect(frontend + '/api/auth/google/callback?state=' + state + '&code=' + code)
})
app.use(createApp({
  db: opened.db, secret: new TextEncoder().encode(process.env.JWT_SECRET!), devLoginEnabled: false,
  today: () => '2026-09-14',
  chatModel: { name: 'test', client: { async complete(messages) {
    await new Promise((resolve) => setTimeout(resolve, 250))
    const current = messages.at(-1)?.content.split('\n\nCâu hỏi: ')[1] ?? ''
    if (current.includes('__e2e_chat_failure__')) throw new HttpError(503, 'OLLAMA_UNAVAILABLE', 'Model fixture tạm không khả dụng.')
    return fixtureCompletion('Bạn cần đăng nhập để tạo dự án [1].')
  } } },
  chatEmbedder: fixtureEmbedder,
  google: { origin: frontend, client: {
    authorizationUrl({ state, nonce, verifier }) { pending.set(state, { nonce, verifier }); return backend + '/__e2e/google?state=' + state },
    async exchange(code, verifier, nonce) {
      const flow = codes.get(code); codes.delete(code)
      assert.equal(flow?.verifier, verifier); assert.equal(flow?.nonce, nonce)
      return { subject: 'e2e-google-subject', email: 'google@e2e.test', name: 'Google E2E' }
    },
  } },
}))
const server = app.listen(4100, '127.0.0.1')
let shuttingDown = false
function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  server.close(() => { void opened.close().then(() => process.exit(0)) })
  server.closeAllConnections()
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, shutdown)
process.on('message', (message) => { if ((message as { type?: string })?.type === 'shutdown') shutdown() })
