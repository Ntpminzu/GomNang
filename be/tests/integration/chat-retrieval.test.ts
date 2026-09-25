import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Db } from '../../src/infrastructure/database/client.ts'
import { buildChatChunks, retrieveChatChunks } from '../../src/modules/chat/chat.retrieval.ts'
import { answerChat, NO_CHAT_EVIDENCE, type ChatDeps } from '../../src/modules/chat/chat.service.ts'

test('chỉ mục tìm được dự án cũ hơn 12 dự án mới nhất, kể cả khi bỏ dấu', () => {
  const projects = Array.from({ length: 15 }, (_, i) => ({
    id: `project-${i}`,
    name: i === 0 ? 'Mùa Sen Tím' : `Vườn Cây ${i}`,
    goal: i === 0 ? 'Trồng sen cho học sinh.' : 'Trồng cây xanh.',
    status: 'published' as const,
    beneficiaryGroup: 'Học sinh',
    location: 'Thủ Đức',
    startDate: '2026-09-01',
    endDate: '2026-10-01',
    needs: [],
  }))
  const sources = retrieveChatChunks('Mục tiêu dự án Mua Sen Tim là gì?', buildChatChunks(projects))
  assert.equal(sources[0]?.id, 'project:project-0:goal-1')
  assert.equal(sources[0]?.url, '/projects/project-0')
  assert.ok(sources[0]?.excerpt.includes('Trồng sen cho học sinh'))
})

test('mục tiêu dài được chia thành các đoạn nguồn có ID ổn định', () => {
  const project = {
    id: 'long-project', name: 'Dự án Hoa Sáng', goal: 'Trồng cây cho học sinh. '.repeat(70),
    status: 'published' as const, beneficiaryGroup: 'Học sinh', location: 'Thủ Đức',
    startDate: '2026-09-01', endDate: '2026-10-01', needs: [],
  }
  const chunks = buildChatChunks([project]).filter((chunk) => chunk.id.includes(':goal-'))
  assert.ok(chunks.length > 1)
  assert.deepEqual(chunks.map((chunk, i) => chunk.id), chunks.map((_, i) => `project:long-project:goal-${i + 1}`))
  assert.ok(chunks.every((chunk) => chunk.excerpt.length < 700 && chunk.url === '/projects/long-project'))
})

test('câu hỏi có tên website vẫn tìm được hướng dẫn liên quan', () => {
  const sources = retrieveChatChunks('Cách tạo dự án trên GOM NẮNG?', buildChatChunks([]))
  assert.equal(sources[0]?.id, 'guide:create-project')
})

test('câu hỏi không khớp nguồn thì không gửi tới model', async () => {
  let called = false
  const deps: ChatDeps = {
    db: {} as Db,
    projects: { async listPublicChatSources() { return [] } },
    models: {
      ollama: { name: 'test', client: { async complete() { called = true; return 'Không nên gọi' } } },
      gemini: { name: 'test', client: null },
    },
  }
  const result = await answerChat(deps, { message: 'Giá vàng quốc tế hôm nay là bao nhiêu?', model: 'ollama', history: [] })
  assert.deepEqual(result, { reply: NO_CHAT_EVIDENCE, sources: [] })
  assert.equal(called, false)
})

test('không công bố câu trả lời thiếu hoặc giả mạo trích dẫn', async () => {
  const deps: ChatDeps = {
    db: {} as Db,
    projects: { async listPublicChatSources() { return [] } },
    models: {
      ollama: { name: 'test', client: { async complete() { return 'Hãy tạo dự án [99].' } } },
      gemini: { name: 'test', client: null },
    },
  }
  const result = await answerChat(deps, { message: 'Cách tạo dự án?', model: 'ollama', history: [] })
  assert.deepEqual(result, { reply: NO_CHAT_EVIDENCE, sources: [] })
})
