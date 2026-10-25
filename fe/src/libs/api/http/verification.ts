import type { ApiAdapter } from '../contracts.ts'
import type { RequestClient } from '../client.ts'
export function verificationHttp(client: RequestClient): Pick<ApiAdapter, 'getVerificationQueue' | 'submitProject' | 'reviewProject' | 'requestAiAssessment'> {
  return {
    getVerificationQueue: (_mode) => client('/api/verification-queue'),
    submitProject: (id, _mode) => client(`/api/projects/${encodeURIComponent(id)}/submit`, { method: 'POST' }),
    reviewProject: (id, input, _mode) => client(`/api/projects/${encodeURIComponent(id)}/review`, { method: 'POST', body: input }),
    // Model chạy trên máy có thể mất cả phút: nới timeout riêng cho lời gọi này.
    requestAiAssessment: (id, input, _mode) => client(`/api/projects/${encodeURIComponent(id)}/ai-assessment`, { method: 'POST', body: input, timeoutMs: 150_000 }),
  }
}
