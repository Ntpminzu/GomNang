import assert from 'node:assert/strict'
import { test } from 'node:test'
import { eq } from 'drizzle-orm'
import { openDb } from '../../src/infrastructure/database/client.ts'
import { chatChunks, projects, users } from '../../src/infrastructure/database/schema.ts'
import { buildChatChunks, createIndex, retrieve } from '../../src/modules/chat/chat.retrieval.ts'
import { answerQuestion, type ChatDeps } from '../../src/modules/chat/chat.service.ts'
import { newChatRun } from '../../src/modules/chat/chat.telemetry.ts'
import { fixtureCompletion, fixtureEmbedder } from '../helpers/chat-fixture.ts'

test('chat reads old indexed public content without rebuilding it, and excludes a project made private', async () => {
  const opened = await openDb(null)
  try {
    const [user] = await opened.db.insert(users).values({ email: 'manual@fixture.test', displayName: 'Fixture' }).returning()
    const [project] = await opened.db.insert(projects).values({ name: 'Mùa Sen Tím', goal: 'Mục tiêu cũ.',
      status: 'published', beneficiaryGroup: 'Học sinh', location: 'Thủ Đức', startDate: '2026-09-01', endDate: '2026-10-01', coordinatorId: user.id }).returning()
    const chunks = buildChatChunks([{ ...project, needs: [] }])
    const first = await createIndex(opened.db, fixtureEmbedder, chunks)
    assert.equal(first.added, chunks.length)
    const second = await createIndex(opened.db, { ...fixtureEmbedder, async embedDocuments() { throw new Error('unchanged documents must not embed') } }, chunks)
    assert.equal(second.unchanged, chunks.length)
    await opened.db.update(projects).set({ goal: 'Mục tiêu mới.' }).where(eq(projects.id, project.id))
    let modelCalls = 0
    const deps: ChatDeps = { db: opened.db,
      embedder: { ...fixtureEmbedder, async embedDocuments() { throw new Error('chat must never index documents') } },
      models: { ollama: { name: 'fixture', client: { async complete(messages) {
        modelCalls++
        assert.ok(messages.at(-1)!.content.includes('Mục tiêu cũ.'))
        assert.ok(!messages.at(-1)!.content.includes('Mục tiêu mới.'))
        return fixtureCompletion('Mục tiêu cũ [1].')
      } } } },
    }
    const input = { message: 'Mục tiêu Mùa Sen Tím?', model: 'ollama' as const, history: [] }
    const run = newChatRun(deps, 'ollama')
    const answer = await answerQuestion(deps, input, run)
    assert.equal(answer.status, 'answered')
    assert.equal(run.embeddedDocuments, 0)
    assert.equal(run.embeddingCalls, 1)
    assert.equal(modelCalls, 1)
    const before = await opened.db.select().from(chatChunks).orderBy(chatChunks.id)
    await opened.db.update(projects).set({ status: 'draft' }).where(eq(projects.id, project.id))
    assert.equal((await answerQuestion(deps, input)).reasonCode, 'NO_EVIDENCE')
    assert.equal(modelCalls, 1)
    assert.deepEqual(await opened.db.select().from(chatChunks).orderBy(chatChunks.id), before)
    await assert.rejects(createIndex(opened.db, fixtureEmbedder, buildChatChunks([]), async () => { throw new Error('source changed') }), /source changed/)
    assert.deepEqual(await opened.db.select().from(chatChunks).orderBy(chatChunks.id), before)
  } finally { await opened.close() }
})

test('missing or wrong-model index fails before query embedding rather than indexing automatically', async () => {
  const opened = await openDb(null)
  try {
    const embedder = { ...fixtureEmbedder, async embedQuery(): Promise<number[]> { throw new Error('must check index first') } }
    const notReady = (error: unknown) => error instanceof Error && 'code' in error && error.code === 'CHAT_INDEX_NOT_READY'
    await assert.rejects(retrieve(opened.db, embedder, 'question'), notReady)
    await createIndex(opened.db, fixtureEmbedder, buildChatChunks([]))
    await assert.rejects(retrieve(opened.db, { ...embedder, model: 'different-model' }, 'question'), notReady)
  } finally { await opened.close() }
})
