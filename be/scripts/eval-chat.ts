import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { desc } from 'drizzle-orm'
import { openDb } from '../src/infrastructure/database/client.ts'
import { chatRequests } from '../src/infrastructure/database/schema.ts'

/**
 * Chạy bộ eval US-7 (RAG chatbot) qua HTTP thật, lấy token/latency từ dòng chat_requests mà backend ghi cho mỗi lượt.
 *   node scripts/eval-chat.ts [--api http://localhost:4000]
 * Cần chạy cùng database với backend (trong Docker: docker compose exec backend node scripts/eval-chat.ts) và chỉ một người dùng chat lúc đó,
 * vì mỗi lượt đọc dòng chat_requests mới nhất.
 */
type Case = { id: string; group: string; message: string; historyFrom?: string; expect: { status: string; reasonCode?: string; mustInclude?: string[] } }
type Reply = { reply: string; sources: unknown[]; status: string; reasonCode: string; promptVersion: string }

const arg = (name: string, fallback: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback }
const api = arg('api', 'http://localhost:4000')
const suite = JSON.parse(readFileSync(new URL('../evals/chat/cases.json', import.meta.url), 'utf8')) as { cases: Case[] }
const opened = await openDb(null, process.env.DATABASE_URL)
const answers = new Map<string, { message: string; reply: string }>()
const rows: { pass: boolean; modelCalls: number; inputTokens: number | null; outputTokens: number | null; embeddingTokens: number | null; latencyMs: number }[] = []

function judge(expect: Case['expect'], got: Reply): string[] {
  const fails: string[] = []
  if (got.status !== expect.status) fails.push(`status ${got.status} ≠ ${expect.status}`)
  if (expect.reasonCode && got.reasonCode !== expect.reasonCode) fails.push(`reason ${got.reasonCode} ≠ ${expect.reasonCode}`)
  for (const word of expect.mustInclude ?? []) if (!got.reply.toLowerCase().includes(word.toLowerCase())) fails.push(`thiếu "${word}"`)
  if (expect.status === 'answered' && got.sources.length === 0) fails.push('answered nhưng không có nguồn')
  if (expect.status === 'refused' && got.sources.length > 0) fails.push('refused nhưng vẫn trả nguồn')
  return fails
}

for (const c of suite.cases) {
  const prev = c.historyFrom ? answers.get(c.historyFrom) : undefined
  const history = prev ? [{ role: 'user', content: prev.message }, { role: 'assistant', content: prev.reply }] : []
  const res = await fetch(`${api}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: c.message, history }) })
  const got = (await res.json()) as Reply
  answers.set(c.id, { message: c.message, reply: got.reply })
  await new Promise((r) => setTimeout(r, 800)) // dòng log ghi nền sau khi response đóng
  const [log] = await opened.db.select().from(chatRequests).orderBy(desc(chatRequests.requestId)).limit(1)
  const fails = res.ok ? judge(c.expect, got) : [`HTTP ${res.status}`]
  const row = {
    id: c.id, group: c.group, pass: fails.length === 0, fails, status: got.status, reasonCode: got.reasonCode, sources: got.sources?.length ?? 0,
    requestId: log.requestId, modelCalls: log.modelCalls, embeddingCalls: log.embeddingCalls,
    inputTokens: log.inputTokens, outputTokens: log.outputTokens, embeddingTokens: log.embeddingTokens, totalTokens: log.totalTokens,
    latencyMs: log.latencyMs, promptVersion: got.promptVersion, reply: got.reply,
  }
  rows.push(row)
  console.log(`${row.pass ? 'PASS' : 'FAIL'} ${c.id} ${row.status}/${row.reasonCode} in=${row.inputTokens} out=${row.outputTokens} emb=${row.embeddingTokens} ${row.latencyMs}ms ${fails.join('; ')}`)
}

const sum = (k: 'inputTokens' | 'outputTokens' | 'embeddingTokens' | 'latencyMs') => rows.reduce((s, r) => s + (r[k] ?? 0), 0)
const summary = { total: `${rows.filter((r) => r.pass).length}/${rows.length}`, inputTokens: sum('inputTokens'), outputTokens: sum('outputTokens'), embeddingTokens: sum('embeddingTokens'), latencyMs: sum('latencyMs'), modelCalls: rows.reduce((s, r) => s + r.modelCalls, 0) }
console.log(JSON.stringify(summary))
const dir = new URL('../evals/chat/results/', import.meta.url)
mkdirSync(dir, { recursive: true })
const file = new URL(`chat-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}.json`, dir)
writeFileSync(file, JSON.stringify({ summary, rows }, null, 2) + '\n')
console.log('saved ' + file.pathname)
await opened.close()
