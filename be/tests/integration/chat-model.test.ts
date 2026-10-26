import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createOllamaChat } from '../../src/modules/chat/chat.model.ts'

test('Ollama adapter gửi model và lấy nội dung trả lời', async () => {
  let sent: Record<string, unknown> | undefined
  const fetchImpl: typeof fetch = async (_url, options) => {
    sent = JSON.parse(String(options?.body))
    return Response.json({ message: { role: 'assistant', content: '  Chào bạn!  ' } })
  }
  const chat = createOllamaChat('http://127.0.0.1:11434', 'qwen3:4b', fetchImpl)
  const reply = await chat.complete([{ role: 'user', content: 'Xin chào' }])
  assert.equal(reply.content, 'Chào bạn!')
  assert.equal(reply.inputTokens, null)
  assert.equal(reply.model, null)
  assert.equal(sent?.format, 'json')
  assert.equal(sent?.model, 'qwen3:4b')
  assert.equal(sent?.stream, false)
  assert.equal(sent?.think, true)
  assert.equal('options' in (sent ?? {}), false)
  assert.deepEqual(sent?.messages, [{ role: 'user', content: 'Xin chào' }])
})

test('Ollama adapter tắt think khi cấu hình máy yếu', async () => {
  let sent: Record<string, unknown> | undefined
  const fetchImpl: typeof fetch = async (_url, options) => {
    sent = JSON.parse(String(options?.body))
    return Response.json({ message: { role: 'assistant', content: 'Chào bạn!' } })
  }
  await createOllamaChat('http://127.0.0.1:11434', 'qwen3:4b', fetchImpl, false).complete([{ role: 'user', content: 'Xin chào' }])
  assert.equal(sent?.think, false)
})

test('Ollama adapter báo lỗi rõ khi không kết nối được', async () => {
  const fetchImpl: typeof fetch = async () => { throw new TypeError('fetch failed') }
  await assert.rejects(
    createOllamaChat('http://127.0.0.1:11434', 'qwen3:4b', fetchImpl).complete([{ role: 'user', content: 'Xin chào' }]),
    (error: unknown) => error instanceof Error && 'code' in error && error.code === 'OLLAMA_UNAVAILABLE',
  )
})

test('Ollama adapter structured output: gửi JSON Schema qua format và tắt think', async () => {
  let sent: Record<string, unknown> | undefined
  const fetchImpl: typeof fetch = async (_url, options) => {
    sent = JSON.parse(String(options?.body))
    return Response.json({ message: { role: 'assistant', content: '{"verdict":"PASS","signals":[]}' }, prompt_eval_count: 812, eval_count: 96 })
  }
  const schema = { type: 'object', properties: { verdict: { type: 'string' } } }
  const result = await createOllamaChat('http://127.0.0.1:11434', 'qwen3:4b', fetchImpl).complete([{ role: 'user', content: 'hồ sơ' }], { schema })
  assert.deepEqual([result.inputTokens, result.outputTokens], [812, 96])
  assert.deepEqual(sent?.format, schema)
  assert.equal(sent?.think, false)
})
