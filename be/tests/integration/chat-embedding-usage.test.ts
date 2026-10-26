import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createOllamaEmbedder } from '../../src/modules/chat/chat.embedding.ts'
import { openDb } from '../../src/infrastructure/database/client.ts'
import { buildChatChunks, createIndex } from '../../src/modules/chat/chat.retrieval.ts'
import { answerQuestion, type ChatDeps } from '../../src/modules/chat/chat.service.ts'
import { newChatRun } from '../../src/modules/chat/chat.telemetry.ts'
import { fixtureCompletion, fixtureEmbedder } from '../helpers/chat-fixture.ts'

test('embedding usage accepts nonnegative integers and preserves vector-only document contract', async () => {
  for (const usage of [15, 0, undefined, null, -1, 1.5, '15', Number.MAX_SAFE_INTEGER + 1]) {
    const vector = Array(1024).fill(0)
    const embedder = createOllamaEmbedder('http://fixture', 'test', async () => Response.json({ embeddings: [vector], prompt_eval_count: usage }))
    const result = await embedder.embedQuery('Question')
    assert.deepEqual(result.embedding, vector)
    assert.equal(result.tokens, usage === 15 || usage === 0 ? usage : null)
    assert.deepEqual(await embedder.embedDocuments(['Document']), [vector])
    assert.deepEqual(await embedder.embedDocuments([]), [])
  }
})
test('query embedding usage survives later model failure; embedding failure stays unknown', async () => {
  const opened = await openDb(null)
  try {
    await createIndex(opened.db, fixtureEmbedder, buildChatChunks([]))
    const deps: ChatDeps = { db: opened.db,
      embedder: { ...fixtureEmbedder, async embedQuery(question) { return { ...(await fixtureEmbedder.embedQuery(question)), tokens: 7 } } },
      model: { name: 'fixture', client: { async complete() { throw new Error('model failed') } } },
    }
    const run = newChatRun(deps)
    await assert.rejects(answerQuestion(deps, { message: 'Cách tạo dự án?', history: [] }, run))
    assert.equal(run.embeddingTokens, 7); assert.equal(run.embeddingCalls, 1); assert.equal(run.modelCalls, 1)
    deps.embedder = { ...fixtureEmbedder, async embedQuery() { throw new Error('embedding failed') } }
    const failed = newChatRun(deps)
    await assert.rejects(answerQuestion(deps, { message: 'Cách tạo dự án?', history: [] }, failed))
    assert.equal(failed.embeddingTokens, null); assert.equal(failed.embeddingCalls, 1); assert.equal(failed.modelCalls, 0)
    deps.embedder = { ...fixtureEmbedder, async embedQuery(question) { return { ...(await fixtureEmbedder.embedQuery(question)), tokens: 0 } } }
    deps.model = { name: 'fixture', client: { async complete() { return fixtureCompletion('Đăng nhập [1].') } } }
    const zero = newChatRun(deps)
    await answerQuestion(deps, { message: 'Cách tạo dự án?', history: [] }, zero)
    assert.equal(zero.embeddingTokens, 0)
  } finally { await opened.close() }
})
