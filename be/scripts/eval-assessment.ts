import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { assessProject, mergeAiAssessment, type AssessmentResult } from '@gomnang/domain/assess.ts'
import type { ProjectInput, Verdict } from '@gomnang/domain/types.ts'

/**
 * Chạy bộ eval US-8 (đánh giá hồ sơ bằng AI) với model thật.
 *   npm run eval:assessment -w gomnang-api -- --model ollama --prompt assessment.v1
 * Kết quả ghi vào be/evals/assessment/results/ để so trước/sau khi đổi prompt.
 */

export type Expect = { notVerdict?: Verdict; minVerdict?: Verdict; verdict?: Verdict; anyCodes?: string[]; forbidCodes?: string[] }
const RANK: Record<Verdict, number> = { PASS: 0, NEEDS_INFO: 1, FLAG: 2 }

/** Luật chấm của bộ eval: trả lý do trượt, rỗng = đạt. Chấm trên kết quả SAU khi gộp với quy tắc (đúng như app dùng). */
export function judge(expect: Expect, result: AssessmentResult): string[] {
  const codes = result.signals.map((s) => s.code.replace(/^AI_/, ''))
  const fails: string[] = []
  if (expect.verdict && result.verdict !== expect.verdict) fails.push(`verdict ${result.verdict} ≠ ${expect.verdict}`)
  if (expect.notVerdict && result.verdict === expect.notVerdict) fails.push(`không được ${expect.notVerdict}`)
  if (expect.minVerdict && RANK[result.verdict] < RANK[expect.minVerdict]) fails.push(`verdict ${result.verdict} thấp hơn ${expect.minVerdict}`)
  if (expect.anyCodes && !expect.anyCodes.some((c) => codes.includes(c))) fails.push(`thiếu một trong ${expect.anyCodes.join('/')}`)
  for (const c of expect.forbidCodes ?? []) if (codes.includes(c)) fails.push(`báo nhầm ${c}`)
  return fails
}

type Case = { id: string; category: 'normal' | 'edge' | 'flag'; title: string; project: Omit<ProjectInput, 'treasurerId'>; expect: Expect }

async function main() {
  const arg = (name: string, fallback: string) => {
    const i = process.argv.indexOf(`--${name}`)
    return i > 0 ? process.argv[i + 1] : fallback
  }
  const provider = arg('model', 'ollama') as 'ollama' | 'gemini'
  const promptVersion = arg('prompt', 'assessment.v1')
  const only = arg('only', '').split(',').filter(Boolean)

  // Import động để file này import được trong unit test mà không đòi cấu hình .env.
  const { loadConfig } = await import('../src/config/env.ts')
  const { createOllamaChat } = await import('../src/modules/chat/chat.model.ts')
  const { createGeminiChat } = await import('../src/modules/chat/gemini.model.ts')
  const { runAiAssessment } = await import('../src/modules/verification/verification.ai.ts')
  const config = loadConfig()
  const modelName = provider === 'gemini' ? config.geminiModel : config.ollamaModel
  const client =
    provider === 'gemini'
      ? config.geminiApiKey
        ? createGeminiChat(config.geminiApiKey, config.geminiModel)
        : null
      : createOllamaChat(config.ollamaBaseUrl, config.ollamaModel)
  if (!client) throw new Error('Chưa cấu hình model ' + provider)

  const suite = JSON.parse(readFileSync(new URL('../evals/assessment/cases.json', import.meta.url), 'utf8')) as { cases: Case[] }
  const cases = suite.cases.filter((c) => only.length === 0 || only.includes(c.id))
  type Row = { id: string; category: Case['category']; pass: boolean; verdict: Verdict | null; codes: string[]; attempts: number | null; latencyMs: number; fails: string[] }
  const rows: Row[] = []
  for (const c of cases) {
    const input: ProjectInput = { ...c.project, treasurerId: null }
    const rules = assessProject(input, [])
    const started = performance.now()
    try {
      const run = await runAiAssessment(client, input, rules, { provider, modelName, promptVersion })
      const merged = mergeAiAssessment(rules, run.result)
      const fails = judge(c.expect, merged)
      rows.push({ id: c.id, category: c.category, pass: fails.length === 0, verdict: merged.verdict, codes: merged.signals.map((s) => s.code), attempts: run.attempts, latencyMs: run.latencyMs, fails })
    } catch (error) {
      const code = (error as { code?: string }).code ?? (error as Error).message
      rows.push({ id: c.id, category: c.category, pass: false, verdict: null, codes: [], attempts: null, latencyMs: Math.round(performance.now() - started), fails: [`lỗi ${code}`] })
    }
    const r = rows.at(-1)!
    console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.id} [${r.category}] ${r.verdict ?? '-'} ${r.codes.join(',')} ${r.latencyMs}ms ${r.fails.join('; ')}`)
  }

  const rate = (list: typeof rows) => `${list.filter((r) => r.pass).length}/${list.length}`
  const ok = rows.filter((r) => r.attempts !== null)
  const summary = {
    promptVersion,
    provider,
    model: modelName,
    decoding: 'json-schema', // provider nhận JSON Schema của output (format / responseJsonSchema)
    total: rate(rows),
    byCategory: Object.fromEntries((['normal', 'edge', 'flag'] as const).map((k) => [k, rate(rows.filter((r) => r.category === k))])),
    avgLatencyMs: Math.round(rows.reduce((s, r) => s + r.latencyMs, 0) / Math.max(rows.length, 1)),
    avgAttempts: ok.length ? Number((ok.reduce((s, r) => s + (r.attempts ?? 0), 0) / ok.length).toFixed(2)) : null,
    errors: rows.filter((r) => r.attempts === null).length,
  }
  console.log(JSON.stringify(summary, null, 2))
  const dir = new URL('../evals/assessment/results/', import.meta.url)
  mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')
  const file = new URL(`${promptVersion}-${provider}-${stamp}.json`, dir)
  writeFileSync(file, JSON.stringify({ summary, rows }, null, 2) + '\n')
  console.log('saved ' + file.pathname)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main()
