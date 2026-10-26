export type AiUsagePeriod = { from: string; to: string; timezone: 'Asia/Ho_Chi_Minh' }
export type AiUsage = {
  period: AiUsagePeriod
  totals: { requests: number; answered: number; refused: number; failed: number;
    modelOrigin: number; ruleOrigin: number; unknownOrigin: number; llmCalls: number; embeddingCalls: number }
  latency: { avgMs: number | null; denominator: number }
  tokens: { total: number | null; totalDenominator: number; avgTotalPerMeasuredRequest: number | null;
    embedding: number | null; embeddingDenominator: number; avgEmbeddingPerMeasuredRequest: number | null }
  cost: { kind: 'local-no-api-bill' }
  tools: { tracked: false }
  byReason: { status: string; reasonCode: string; httpStatus: number; count: number }[]
  recent: { requestId: number; startedAt: string; status: string; reasonCode: string; httpStatus: number;
    origin: string | null; requestedModel: string | null; actualModel: string | null; embeddingModel: string;
    promptVersion: string; queryPromptVersion: string; modelCalls: number; embeddingCalls: number;
    inputTokens: number | null; outputTokens: number | null; thinkingTokens: number | null;
    totalTokens: number | null; embeddingTokens: number | null; latencyMs: number }[]
}
