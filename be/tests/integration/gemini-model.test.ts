import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createGeminiChat } from '../../src/modules/chat/gemini.model.ts'

test('Gemini adapter chuyển system, history và lấy câu trả lời', async () => {
  let url = ''
  let headers: Headers | undefined
  let body: Record<string, unknown> | undefined
  const fetchImpl: typeof fetch = async (input, init) => {
    url = String(input)
    headers = new Headers(init?.headers)
    body = JSON.parse(String(init?.body))
    return Response.json({ candidates: [{ content: { parts: [{ text: 'Chào ' }, { text: 'bạn!' }] } }] })
  }
  const client = createGeminiChat('test-key', 'gemini-3.8-flash', fetchImpl)
  const reply = await client.complete([
    { role: 'system', content: 'Trả lời tiếng Việt' },
    { role: 'user', content: 'Xin chào' },
    { role: 'assistant', content: 'Chào bạn' },
    { role: 'user', content: 'Bạn là ai?' },
  ])
  assert.equal(reply, 'Chào bạn!')
  assert.match(url, /gemini-3\.8-flash:generateContent$/)
  assert.equal(headers?.get('x-goog-api-key'), 'test-key')
  assert.deepEqual(body?.system_instruction, { parts: [{ text: 'Trả lời tiếng Việt' }] })
  assert.deepEqual(body?.contents, [
    { role: 'user', parts: [{ text: 'Xin chào' }] },
    { role: 'model', parts: [{ text: 'Chào bạn' }] },
    { role: 'user', parts: [{ text: 'Bạn là ai?' }] },
  ])
  assert.equal('generationConfig' in (body ?? {}), false)
})

test('Gemini adapter báo giới hạn lượt gọi bằng mã riêng', async () => {
  const fetchImpl: typeof fetch = async () => new Response(null, { status: 429 })
  await assert.rejects(
    createGeminiChat('test-key', 'gemini-3.8-flash', fetchImpl).complete([{ role: 'user', content: 'Xin chào' }]),
    (error: unknown) => error instanceof Error && 'code' in error && error.code === 'GEMINI_RATE_LIMIT',
  )
})

test('Gemini adapter báo quá tải để người dùng thử lại sau', async () => {
  const fetchImpl: typeof fetch = async () => new Response(null, { status: 503 })
  await assert.rejects(
    createGeminiChat('test-key', 'gemini-3.8-flash', fetchImpl).complete([{ role: 'user', content: 'Xin chào' }]),
    (error: unknown) => error instanceof Error && 'code' in error && error.code === 'GEMINI_BUSY',
  )
})

test('Gemini adapter structured output: đặt responseMimeType và responseJsonSchema', async () => {
  let body: Record<string, unknown> | undefined
  const fetchImpl: typeof fetch = async (_input, init) => {
    body = JSON.parse(String(init?.body))
    return Response.json({ candidates: [{ content: { parts: [{ text: '{"verdict":"PASS","signals":[]}' }] } }] })
  }
  const schema = { type: 'object', properties: { verdict: { type: 'string' } } }
  await createGeminiChat('test-key', 'gemini-3.8-flash', fetchImpl).complete([{ role: 'user', content: 'hồ sơ' }], { schema })
  assert.deepEqual(body?.generationConfig, { responseMimeType: 'application/json', responseJsonSchema: schema })
})
