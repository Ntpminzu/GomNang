import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import type { Db, Exec } from '../../infrastructure/database/client.ts'
import { aiRequests as q, chatRequests as r, projects, users } from '../../infrastructure/database/schema.ts'
import type { AiUsage, AiUsagePeriod, AssessmentUsage } from '@gomnang/domain/ai-usage.ts'
export async function listVerifiers(exec: Exec) {
  const rows = await exec.select({ id: users.id, name: users.displayName, email: users.email, createdAt: users.createdAt })
    .from(users).where(eq(users.role, 'verifier')).orderBy(desc(users.createdAt))
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
}

export async function getAiUsage(db: Db, period: AiUsagePeriod): Promise<AiUsage> {
  // One database snapshot keeps totals, reasons and recent consistent while chat logs arrive.
  return db.transaction(async (tx) => {
    const where = and(gte(r.startedAt, new Date(period.from)), lt(r.startedAt, new Date(period.to)))
    const [row] = await tx.select({
      requests: sql<number>`count(*)::int`,
      answered: sql<number>`(count(*) filter (where ${r.status} = 'answered'))::int`,
      refused: sql<number>`(count(*) filter (where ${r.status} = 'refused'))::int`,
      failed: sql<number>`(count(*) filter (where ${r.status} = 'failed'))::int`,
      modelOrigin: sql<number>`(count(*) filter (where ${r.origin} = 'model'))::int`,
      ruleOrigin: sql<number>`(count(*) filter (where ${r.origin} = 'rule'))::int`,
      unknownOrigin: sql<number>`(count(*) filter (where ${r.origin} is null))::int`,
      llmCalls: sql<number | null>`sum(${r.modelCalls})::float8`,
      embeddingCalls: sql<number | null>`sum(${r.embeddingCalls})::float8`,
      avgMs: sql<number | null>`avg(${r.latencyMs})::float8`,
      total: sql<number | null>`sum(${r.totalTokens})::float8`,
      totalDenominator: sql<number>`count(${r.totalTokens})::int`,
      avgTotalPerMeasuredRequest: sql<number | null>`avg(${r.totalTokens})::float8`,
      embedding: sql<number | null>`sum(${r.embeddingTokens})::float8`,
      embeddingDenominator: sql<number>`count(${r.embeddingTokens})::int`,
      avgEmbeddingPerMeasuredRequest: sql<number | null>`avg(${r.embeddingTokens})::float8`,
    }).from(r).where(where)
    const byReason = await tx.select({ status: r.status, reasonCode: r.reasonCode, httpStatus: r.httpStatus,
      count: sql<number>`count(*)::int` }).from(r).where(where)
      .groupBy(r.status, r.reasonCode, r.httpStatus).orderBy(r.status, r.reasonCode, r.httpStatus)
    const recent = await tx.select({ requestId: r.requestId, startedAt: r.startedAt, status: r.status,
      reasonCode: r.reasonCode, httpStatus: r.httpStatus, origin: r.origin, requestedModel: r.requestedModel,
      actualModel: r.actualModel, embeddingModel: r.embeddingModel, promptVersion: r.promptVersion,
      queryPromptVersion: r.queryPromptVersion, modelCalls: r.modelCalls, embeddingCalls: r.embeddingCalls,
      inputTokens: r.inputTokens, outputTokens: r.outputTokens, thinkingTokens: r.thinkingTokens,
      totalTokens: r.totalTokens, embeddingTokens: r.embeddingTokens, latencyMs: r.latencyMs,
    }).from(r).where(where).orderBy(desc(r.startedAt), desc(r.requestId)).limit(50)
    const assessment = await assessmentUsage(tx, period)
    return {
      period,
      totals: { requests: row.requests, answered: row.answered, refused: row.refused, failed: row.failed,
        modelOrigin: row.modelOrigin, ruleOrigin: row.ruleOrigin, unknownOrigin: row.unknownOrigin,
        llmCalls: row.llmCalls ?? 0, embeddingCalls: row.embeddingCalls ?? 0 },
      latency: { avgMs: row.avgMs, denominator: row.requests },
      tokens: { total: row.requests === 0 ? 0 : row.total, totalDenominator: row.totalDenominator,
        avgTotalPerMeasuredRequest: row.avgTotalPerMeasuredRequest,
        embedding: row.requests === 0 ? 0 : row.embedding, embeddingDenominator: row.embeddingDenominator,
        avgEmbeddingPerMeasuredRequest: row.avgEmbeddingPerMeasuredRequest },
      cost: { kind: 'local-no-api-bill' }, tools: { tracked: false }, byReason,
      recent: recent.map((item) => ({ ...item, startedAt: item.startedAt.toISOString() })),
      assessment,
    }
  }, { isolationLevel: 'repeatable read', accessMode: 'read only' })
}

/** Người gác cổng (US-8): mỗi lần đánh giá là một dòng ai_requests; lần chạy eval tách riêng, không tính vào sử dụng thật. */
async function assessmentUsage(tx: Exec, period: AiUsagePeriod): Promise<AssessmentUsage> {
  const inPeriod = and(gte(q.createdAt, new Date(period.from)), lt(q.createdAt, new Date(period.to)))
  const where = and(inPeriod, eq(q.feature, 'assessment'))
  const [row] = await tx.select({
    requests: sql<number>`count(*)::int`,
    ok: sql<number>`(count(*) filter (where ${q.outcome} = 'ok'))::int`,
    invalidOutput: sql<number>`(count(*) filter (where ${q.outcome} = 'invalid_output'))::int`,
    failed: sql<number>`(count(*) filter (where ${q.outcome} = 'error'))::int`,
    modelCalls: sql<number>`coalesce(sum(${q.attempts}), 0)::int`,
    avgMs: sql<number | null>`avg(${q.latencyMs})::float8`,
    p95Ms: sql<number | null>`percentile_cont(0.95) within group (order by ${q.latencyMs})::float8`,
    input: sql<number>`coalesce(sum(${q.inputTokens}), 0)::int`,
    output: sql<number>`coalesce(sum(${q.outputTokens}), 0)::int`,
    avgPerRequest: sql<number | null>`avg(${q.inputTokens} + ${q.outputTokens})::float8`,
  }).from(q).where(where)
  const [evals] = await tx.select({ n: sql<number>`count(*)::int` }).from(q).where(and(inPeriod, eq(q.feature, 'assessment_eval')))
  const byVersion = await tx.select({ model: q.model, promptVersion: q.promptVersion, requests: sql<number>`count(*)::int`,
    avgMs: sql<number | null>`avg(${q.latencyMs})::float8` }).from(q).where(where)
    .groupBy(q.model, q.promptVersion).orderBy(q.model, q.promptVersion)
  const byOutcome = await tx.select({ outcome: q.outcome, errorCode: q.errorCode, count: sql<number>`count(*)::int` })
    .from(q).where(where).groupBy(q.outcome, q.errorCode).orderBy(q.outcome, q.errorCode)
  const recent = await tx.select({ id: q.id, createdAt: q.createdAt, outcome: q.outcome, errorCode: q.errorCode, model: q.model,
    promptVersion: q.promptVersion, attempts: q.attempts, inputTokens: q.inputTokens, outputTokens: q.outputTokens,
    latencyMs: q.latencyMs, projectId: q.projectId, projectName: projects.name })
    .from(q).leftJoin(projects, eq(q.projectId, projects.id)).where(where).orderBy(desc(q.createdAt)).limit(50)
  return {
    totals: { requests: row.requests, ok: row.ok, invalidOutput: row.invalidOutput, failed: row.failed, modelCalls: row.modelCalls, evalRuns: evals.n },
    latency: { avgMs: row.avgMs, p95Ms: row.p95Ms },
    tokens: { input: row.input, output: row.output, avgPerRequest: row.avgPerRequest },
    byVersion, byOutcome,
    recent: recent.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
  }
}
