import type { ApiAdapter } from '../contracts.ts'
import type { RequestClient } from '../client.ts'
export function verificationHttp(client: RequestClient): Pick<ApiAdapter, 'getVerificationQueue' | 'submitProject' | 'reviewProject'> {
  return {
    getVerificationQueue: (_mode) => client('/api/verification-queue'),
    submitProject: (id, _mode) => client(`/api/projects/${encodeURIComponent(id)}/submit`, { method: 'POST' }),
    reviewProject: (id, input, _mode) => client(`/api/projects/${encodeURIComponent(id)}/review`, { method: 'POST', body: input })
  }
}
