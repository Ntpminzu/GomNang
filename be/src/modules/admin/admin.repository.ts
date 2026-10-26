import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import type { Db, Exec } from '../../infrastructure/database/client.ts'
import { chatRequests as r, users } from '../../infrastructure/database/schema.ts'
import type { AiUsage, AiUsagePeriod } from '@gomnang/domain/ai-usage.ts'
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
    }
  }, { isolationLevel: 'repeatable read', accessMode: 'read only' })
}
