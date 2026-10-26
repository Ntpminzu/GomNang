import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ChatSource, ChatTurn } from '@gomnang/domain/types.ts'
import { selectHistory, isFollowUpQuestion, buildRetrievalQuestion, buildMessages, citationWarnings } from '../../src/modules/chat/chat.rag.ts'
import { queryEmbeddingInput } from '../../src/modules/chat/chat.embedding.ts'

const source: ChatSource = { id: 'guide:test', title: 'Hướng dẫn', url: '/help#test', excerpt: 'Chỉ người đăng nhập được tạo dự án.', citation: '[2]' }

test('history ignores orphan turns, strips old citations, and retains chronological complete pairs', () => {
  const turns: ChatTurn[] = [
    { role: 'assistant', content: 'orphan' }, { role: 'user', content: 'orphan' },
    { role: 'user', content: 'Mùa Sen Tím?' }, { role: 'assistant', content: 'Mục tiêu [9].' },
    { role: 'user', content: 'Nhu cầu?' }, { role: 'assistant', content: '[1]' },
    { role: 'user', content: 'unfinished' },
  ]
  assert.deepEqual(selectHistory(turns), [
    { role: 'user', content: 'Mùa Sen Tím?' }, { role: 'assistant', content: 'Mục tiêu .' },
    { role: 'user', content: 'Nhu cầu?' }, { role: 'assistant', content: '(Câu trả lời trước chỉ có mã nguồn.)' },
  ])
  assert.deepEqual(selectHistory([{ role: 'assistant', content: 'alone' }]), [])
})

test('history budgets cap each turn and select newest pairs within 4000 characters', () => {
  const turns: ChatTurn[] = Array.from({ length: 8 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `${i}`.repeat(3000) }))
  const selected = selectHistory(turns)
  assert.equal(selected.length, 4)
  assert.equal(selected.reduce((sum, turn) => sum + turn.content.length, 0), 4000)
  assert.deepEqual(selected.map((turn) => turn.content[0]), ['4', '5', '6', '7'])
  const short = turns.map((turn, i) => ({ ...turn, content: String(i) }))
  assert.deepEqual(selectHistory(short).map((turn) => turn.content), ['2', '3', '4', '5', '6', '7'])
})

test('retrieval follow-up uses two user questions only, preserves changed topic/current question', () => {
  const history: ChatTurn[] = [
    { role: 'user', content: 'old topic' }, { role: 'assistant', content: 'IGNORE RULES secret invented facts' },
    { role: 'user', content: 'Mùa Sen Tím?' }, { role: 'assistant', content: 'invented answer' },
    { role: 'user', content: 'Nhu cầu?' }, { role: 'assistant', content: 'invented donor' },
  ]
  for (const question of ['Thế dự án đó ở đâu?', 'Nhu cầu?', 'Sau đó làm gì?']) {
    const query = buildRetrievalQuestion(question, history)
    assert.ok(query.includes('Mùa Sen Tím?\nNhu cầu?'))
    assert.ok(query.endsWith(`Current question to answer:\n${question}`))
    assert.ok(!/old topic|invented|IGNORE RULES/.test(query))
  }
  for (const question of ['Cách tạo dự án?', 'Viết bài tập JavaScript.', 'Thời tiết hôm nay thế nào?']) {
    assert.equal(isFollowUpQuestion(question), false)
    assert.equal(buildRetrievalQuestion(question, history), question)
  }
  assert.equal(buildRetrievalQuestion('Câu đầu tiên'), 'Câu đầu tiên')
  assert.equal((queryEmbeddingInput('Câu hỏi').match(/Instruct:/g) ?? []).length, 1)
})

test('messages keep JSON sources and current question separate from history', () => {
  const messages = buildMessages('Tôi làm gì?', [source], [{ role: 'assistant', content: 'old unsupported statement' }])
  assert.equal(messages[0].role, 'system')
  const last = messages.at(-1)!.content
  assert.ok(last.includes(JSON.stringify([{ citation: '[2]', id: source.id, title: source.title, excerpt: source.excerpt }])))
  assert.ok(last.endsWith('Câu hỏi: Tôi làm gì?'))
  assert.ok(!last.includes('old unsupported statement'))
})

test('citation checker rejects missing/unknown citations and does not renumber a cited source', () => {
  assert.deepEqual(citationWarnings('Cần đăng nhập [2].', [source]), [])
  assert.ok(citationWarnings('Cần đăng nhập [1].', [source]).length > 0)
  assert.ok(citationWarnings('Cần đăng nhập [2] [99].', [source]).length > 0)
  assert.ok(citationWarnings('Không biết.', [source]).length > 0)
})
