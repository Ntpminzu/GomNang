import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { before, after, test } from 'node:test'
import { buildChatChunks, createIndex, retrieve } from '../../src/modules/chat/chat.retrieval.ts'
import { answerQuestion, NO_CHAT_EVIDENCE, type ChatDeps } from '../../src/modules/chat/chat.service.ts'
import { openDb } from '../../src/infrastructure/database/client.ts'
import { projects, users } from '../../src/infrastructure/database/schema.ts'
import { fixtureCompletion, fixtureEmbedder } from '../helpers/chat-fixture.ts'

let opened: Awaited<ReturnType<typeof openDb>>
let coordinatorId: string
before(async () => {
  opened = await openDb(null)
  coordinatorId = (await opened.db.insert(users).values({ email: 'retrieval@fixture.test', displayName: 'Fixture' }).returning())[0].id
})
after(async () => { await opened?.close() })

test('pgvector finds a source outside top 12 using the async embedder contract', async () => {
  const rows = await opened.db.insert(projects).values(Array.from({ length: 15 }, (_, i) => ({
    name: i === 0 ? 'Mùa Sen Tím' : 'Vườn Cây ' + i,
    goal: i === 0 ? 'Trồng sen cho học sinh.' : 'Trồng cây xanh.',
    status: 'published' as const, beneficiaryGroup: 'Học sinh', location: 'Thủ Đức',
    startDate: '2026-09-01', endDate: '2026-10-01', coordinatorId,
  }))).returning()
  const chunks = buildChatChunks(rows.map((row) => ({ ...row, needs: [] })))
  await createIndex(opened.db, fixtureEmbedder, chunks)
  const sources = await retrieve(opened.db, fixtureEmbedder, 'Mục tiêu dự án Mua Sen Tim là gì?')
  assert.equal(sources[0]?.id, 'project:' + rows[0].id + ':chunk-1')
  assert.equal(sources[0]?.url, '/projects/' + rows[0].id)
  assert.ok(sources[0]?.excerpt.includes('Trồng sen cho học sinh'))
})

test('long document chunks retain stable IDs and overlap without truncation', () => {
  const id = randomUUID()
  const chunks = buildChatChunks([{ id, name: 'Dự án Hoa Sáng', goal: 'Trồng cây cho học sinh. '.repeat(70),
    status: 'published', beneficiaryGroup: 'Học sinh', location: 'Thủ Đức',
    startDate: '2026-09-01', endDate: '2026-10-01', needs: [],
  }]).filter((chunk) => chunk.projectId === id)
  assert.ok(chunks.length > 1)
  assert.deepEqual(chunks.map((chunk) => chunk.id), chunks.map((_, i) => 'project:' + id + ':chunk-' + (i + 1)))
  assert.ok(chunks.every((chunk) => chunk.content.length < 1000 && chunk.url === '/projects/' + id))
})

test('guide retrieval uses persisted vectors and current async signature', async () => {
  await createIndex(opened.db, fixtureEmbedder, buildChatChunks([]))
  const sources = await retrieve(opened.db, fixtureEmbedder, 'Cách tạo dự án trên GOM NẮNG?')
  assert.equal(sources[0]?.id, 'guide:create-project')
})

async function deps(complete: () => Promise<string>, sources: Parameters<typeof buildChatChunks>[0] = []): Promise<ChatDeps> {
  await createIndex(opened.db, fixtureEmbedder, buildChatChunks(sources))
  return { db: opened.db, embedder: fixtureEmbedder,
    model: { name: 'test', client: { async complete() { return fixtureCompletion(await complete()) } } } }
}
test('listing requests use retrieval and call the model with bounded sources', async () => {
  let called = false
  const publicProjects = Array.from({ length: 7 }, (_, i) => ({
    id: randomUUID(), name: 'Dự án công khai ' + (i + 1), goal: 'Mục tiêu ' + (i + 1),
    status: 'published' as const, beneficiaryGroup: 'Học sinh', location: 'Thủ Đức',
    startDate: '2026-09-01', endDate: '2026-10-01', needs: [],
  }))
  await opened.db.insert(projects).values(publicProjects.map(({ needs: _needs, ...project }) => ({ ...project, coordinatorId })))
  const result = await answerQuestion(await deps(async () => { called = true; return 'Một kết quả tìm được [1].' }, publicProjects), { message: 'cho tôi thông tin về các dự án hiện có đi', history: [] })
  assert.equal(result.status, 'answered')
  assert.ok(result.sources.length > 0 && result.sources.length <= 5)
  assert.equal(result.generatedByModel, true); assert.equal(called, true)
})
test('no relevant vector yields refusal without calling model', async () => {
  let called = false
  const result = await answerQuestion(await deps(async () => { called = true; return 'Không nên gọi' }), { message: 'Giá vàng quốc tế hôm nay là bao nhiêu?', history: [] })
  assert.equal(result.reply, NO_CHAT_EVIDENCE)
  assert.equal(result.status, 'refused')
  assert.equal(result.reasonCode, 'NO_EVIDENCE')
  assert.deepEqual(result.sources, [])
  assert.equal(result.generatedByModel, false)
  assert.equal(called, false)
})
test('invalid model citations are not published', async () => {
  await assert.rejects(answerQuestion(await deps(async () => 'Hãy tạo dự án [99].'), { message: 'Cách tạo dự án?', history: [] }),
    (error: unknown) => error instanceof Error && 'code' in error && error.code === 'CHAT_CITATION_INVALID')
})
