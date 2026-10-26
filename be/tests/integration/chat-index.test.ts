import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { eq } from 'drizzle-orm'
import { openDb } from '../../src/infrastructure/database/client.ts'
import { chatChunks, projects, users } from '../../src/infrastructure/database/schema.ts'
import { buildChatChunks, createIndex, retrieve, type ChatChunkDraft } from '../../src/modules/chat/chat.retrieval.ts'
import { answerQuestion, type ChatDeps } from '../../src/modules/chat/chat.service.ts'
import { fixtureCompletion, fixtureEmbedder } from '../helpers/chat-fixture.ts'

let opened: Awaited<ReturnType<typeof openDb>>
let coordinatorId: string
before(async () => {
  opened = await openDb(null)
  coordinatorId = (await opened.db.insert(users).values({ email: 'index@fixture.test', displayName: 'Fixture' }).returning())[0].id
})
after(async () => { await opened?.close() })

test('index serializes concurrent syncs, embeds only changed chunks, removes stale chunks, and switches model', async () => {
  const chunks = buildChatChunks([])
  let count = 0
  const embedder = { ...fixtureEmbedder, async embedDocuments(texts: string[]) {
    count += texts.length
    return fixtureEmbedder.embedDocuments(texts)
  } }
  await Promise.all([createIndex(opened.db, embedder, chunks), createIndex(opened.db, embedder, chunks)])
  assert.equal(count, chunks.length)
  const changed = chunks.map((chunk, i) => i === 0 ? { ...chunk, content: chunk.content + ' updated' } : chunk)
  await createIndex(opened.db, embedder, changed)
  assert.equal(count, chunks.length + 1)
  assert.equal((await opened.db.select().from(chatChunks).where(eq(chatChunks.id, changed[0].id)))[0].content, changed[0].content)
  await createIndex(opened.db, embedder, changed.slice(1))
  assert.ok(!(await opened.db.select().from(chatChunks)).some((row) => row.id === chunks[0].id))
  count = 0
  await createIndex(opened.db, { ...embedder, model: 'fixture-v2' }, changed.slice(1))
  assert.equal(count, changed.length - 1)
  assert.ok((await opened.db.select().from(chatChunks)).every((row) => row.embeddingModel === 'fixture-v2'))
})

test('failed second embedding batch preserves entire old index; next sync recovers', async () => {
  await createIndex(opened.db, fixtureEmbedder, buildChatChunks([]))
  const beforeRows = await opened.db.select().from(chatChunks).orderBy(chatChunks.id)
  const desired: ChatChunkDraft[] = Array.from({ length: 33 }, (_, i) => ({
    id: `guide:create-project:chunk-${i + 1}`, projectId: null, title: `Batch ${i}`, url: '/help#create-project', content: 'new',
  }))
  let batches = 0
  const failing = { ...fixtureEmbedder, async embedDocuments(texts: string[]) {
    if (++batches === 2) throw new Error('fixture embedding unavailable')
    return fixtureEmbedder.embedDocuments(texts)
  } }
  await assert.rejects(createIndex(opened.db, failing, desired), /fixture embedding unavailable/)
  assert.equal(batches, 2)
  assert.deepEqual(await opened.db.select().from(chatChunks).orderBy(chatChunks.id), beforeRows)
  await createIndex(opened.db, fixtureEmbedder, buildChatChunks([]))
  assert.deepEqual(await opened.db.select().from(chatChunks).orderBy(chatChunks.id), beforeRows)
})

test('pgvector filters hidden projects before topK while retaining guide sources', async () => {
  const rows = await opened.db.insert(projects).values(Array.from({ length: 7 }, (_, i) => ({
    name: `Private ${i}`, goal: 'Cách tạo dự án', status: 'published' as const,
    beneficiaryGroup: 'Học sinh', location: 'Thủ Đức', startDate: '2026-09-01', endDate: '2026-10-01', coordinatorId,
  }))).returning()
  const queryVector = Array<number>(1024).fill(0); queryVector[0] = 1
  const rankedEmbedder = { ...fixtureEmbedder, model: 'visibility-ranking',
    async embedDocuments(texts: string[]) {
      return texts.map((text) => {
        const vector = Array<number>(1024).fill(0)
        if (text.startsWith('Dự án Private')) vector[0] = 1
        else if (text.includes('Bạn cần đăng nhập trước khi tạo')) { vector[0] = 0.8; vector[1] = 0.6 }
        else vector[2] = 1
        return vector
      })
    },
    async embedQuery() { return queryVector },
  }
  await createIndex(opened.db, rankedEmbedder, buildChatChunks(rows.map((row) => ({ ...row, needs: [] }))))
  const before = await retrieve(opened.db, rankedEmbedder, 'Cách tạo dự án?', 1)
  assert.ok(before[0].id.startsWith('project:'))
  for (const row of rows) await opened.db.update(projects).set({ status: 'draft' }).where(eq(projects.id, row.id))
  // Index still contains old project vectors; retrieval must check live visibility itself.
  const sources = await retrieve(opened.db, rankedEmbedder, 'Cách tạo dự án?', 1)
  assert.equal(sources.length, 1)
  assert.equal(sources[0].id, 'guide:create-project')
  await createIndex(opened.db, fixtureEmbedder, buildChatChunks([]))
  assert.ok((await opened.db.select().from(chatChunks)).every((row) => row.projectId === null))
})

test('follow-up retrieval embeds user context only and returns current source links', async () => {
  await createIndex(opened.db, fixtureEmbedder, buildChatChunks([]))
  let question = ''
  const deps: ChatDeps = {
    db: opened.db,
    embedder: { ...fixtureEmbedder, async embedQuery(input) { question = input; return fixtureEmbedder.embedQuery(input) } },
    model: { name: 'fixture', client: { async complete(messages) {
      assert.ok(messages.at(-1)!.content.includes('guide:create-project'))
      assert.ok(messages.at(-1)!.content.endsWith('Câu hỏi: Sau đó làm gì?'))
      return fixtureCompletion('Bạn cần đăng nhập [1].')
    } } },
  }
  const result = await answerQuestion(deps, { message: 'Sau đó làm gì?', history: [
    { role: 'user', content: 'Cách tạo dự án?' }, { role: 'assistant', content: 'untrusted claim [99]' },
  ] })
  assert.ok(question.includes('Cách tạo dự án?'))
  assert.ok(!question.includes('untrusted claim'))
  assert.equal(result.sources[0].url, '/help#create-project')
  assert.equal(result.generatedByModel, true)
})

test('a reply citing only source [2] preserves that number in response sources', async () => {
  const common = await fixtureEmbedder.embedQuery('Cách tạo dự án?')
  const embedder = { ...fixtureEmbedder, model: 'all-similar', async embedDocuments(texts: string[]) { return texts.map(() => common) } }
  await createIndex(opened.db, embedder, buildChatChunks([]))
  const result = await answerQuestion({
    db: opened.db, embedder,
    model: { name: 'fixture', client: { async complete() { return fixtureCompletion('Thông tin [2].') } } },
  }, { message: 'Cách tạo dự án?', history: [] })
  assert.equal(result.generatedByModel, true)
  assert.equal(result.sources.length, 1)
  assert.equal(result.sources[0].citation, '[2]')
})

test('a new unrelated question does not borrow project history to obtain unrelated sources', async () => {
  await createIndex(opened.db, fixtureEmbedder, buildChatChunks([]))
  let query = ''
  const result = await answerQuestion({
    db: opened.db,
    embedder: { ...fixtureEmbedder, async embedQuery(value) { query = value; return fixtureEmbedder.embedQuery(value) } },
    model: { name: 'fixture', client: { async complete() { throw new Error('no evidence must not call generation') } } },
  }, { message: 'Hãy viết code tạo website bán hàng bằng React.', history: [
    { role: 'user', content: 'Cách tạo dự án?' }, { role: 'assistant', content: 'Đăng nhập trước [1].' },
  ] })
  assert.equal(query, 'Hãy viết code tạo website bán hàng bằng React.')
  assert.equal(result.reasonCode, 'NO_EVIDENCE')
  assert.equal(result.generatedByModel, false)
})
