import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { before, after, test } from 'node:test'
import { buildChatChunks, isPublicProjectListRequest, retrieveChatChunks } from '../../src/modules/chat/chat.retrieval.ts'
import { answerChat, NO_CHAT_EVIDENCE, type ChatDeps } from '../../src/modules/chat/chat.service.ts'
import { openDb } from '../../src/infrastructure/database/client.ts'
import { projects, users } from '../../src/infrastructure/database/schema.ts'
import { fixtureEmbedder } from '../helpers/chat-fixture.ts'

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
  const sources = await retrieveChatChunks(opened.db, fixtureEmbedder, 'Mục tiêu dự án Mua Sen Tim là gì?', chunks)
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
  assert.ok(chunks.every((chunk) => chunk.excerpt.length < 1000 && chunk.url === '/projects/' + id))
})

test('guide retrieval uses persisted vectors and current async signature', async () => {
  const sources = await retrieveChatChunks(opened.db, fixtureEmbedder, 'Cách tạo dự án trên GOM NẮNG?', buildChatChunks([]))
  assert.equal(sources[0]?.id, 'guide:create-project')
})

test('catalog request is distinct from how-to and location queries', () => {
  assert.equal(isPublicProjectListRequest('cho tôi thông tin về các dự án hiện có đi'), true)
  assert.equal(isPublicProjectListRequest('Liệt kê các dự án công khai'), true)
  assert.equal(isPublicProjectListRequest('Tôi có thể tìm dự án ở đâu?'), false)
  assert.equal(isPublicProjectListRequest('Các dự án ở Thủ Đức có gì?'), false)
})

function deps(complete: () => Promise<string>, sources: Parameters<typeof buildChatChunks>[0] = []): ChatDeps {
  return { db: opened.db, embedder: fixtureEmbedder,
    projects: { async listPublicChatSources() { return sources } },
    models: { ollama: { name: 'test', client: { complete } }, gemini: { name: 'test', client: null } } }
}
test('catalog cites all public fixture projects without calling model', async () => {
  let called = false
  const publicProjects = Array.from({ length: 3 }, (_, i) => ({
    id: randomUUID(), name: 'Dự án công khai ' + (i + 1), goal: 'Mục tiêu ' + (i + 1),
    status: 'published' as const, beneficiaryGroup: 'Học sinh', location: 'Thủ Đức',
    startDate: '2026-09-01', endDate: '2026-10-01', needs: [],
  }))
  const result = await answerChat(deps(async () => { called = true; return 'Không nên gọi' }, publicProjects), { message: 'cho tôi thông tin về các dự án hiện có đi', model: 'ollama', history: [] })
  assert.match(result.reply, /Hiện có 3 dự án công khai:/)
  assert.deepEqual(result.sources.map((s) => s.url), publicProjects.map((p) => '/projects/' + p.id))
  assert.equal(result.generatedByModel, false); assert.equal(called, false)
})
test('no relevant vector yields refusal without calling model', async () => {
  let called = false
  const result = await answerChat(deps(async () => { called = true; return 'Không nên gọi' }), { message: 'Giá vàng quốc tế hôm nay là bao nhiêu?', model: 'ollama', history: [] })
  assert.deepEqual(result, { reply: NO_CHAT_EVIDENCE, sources: [], generatedByModel: false })
  assert.equal(called, false)
})
test('invalid model citations are not published', async () => {
  const result = await answerChat(deps(async () => 'Hãy tạo dự án [99].'), { message: 'Cách tạo dự án?', model: 'ollama', history: [] })
  assert.deepEqual(result, { reply: NO_CHAT_EVIDENCE, sources: [], generatedByModel: false })
})
