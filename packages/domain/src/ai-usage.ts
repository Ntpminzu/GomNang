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
  /** Năng lực AI thứ hai (US-8): người gác cổng đánh giá hồ sơ, đọc từ bảng ai_requests. */
  assessment: AssessmentUsage
}

export type AssessmentOutcome = 'ok' | 'invalid_output' | 'error'
export type AssessmentUsage = {
  totals: { requests: number; ok: number; invalidOutput: number; failed: number; modelCalls: number; evalRuns: number }
  latency: { avgMs: number | null; p95Ms: number | null }
  tokens: { input: number; output: number; avgPerRequest: number | null }
  byVersion: { model: string; promptVersion: string; requests: number; avgMs: number | null }[]
  byOutcome: { outcome: AssessmentOutcome; errorCode: string | null; count: number }[]
  recent: { id: string; createdAt: string; outcome: AssessmentOutcome; errorCode: string | null; model: string; promptVersion: string;
    attempts: number; inputTokens: number; outputTokens: number; latencyMs: number; projectId: string | null; projectName: string | null }[]
}
