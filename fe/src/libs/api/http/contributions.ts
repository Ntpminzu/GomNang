import type { ApiAdapter } from '../contracts.ts'
import type { RequestClient } from '../client.ts'
export function contributionsHttp(client: RequestClient): Pick<ApiAdapter, 'commitContribution' | 'transitionContribution'> {
  return {
    commitContribution: (id, input, _mode) => client(`/api/projects/${encodeURIComponent(id)}/contributions`, { method: 'POST', body: input }),
    transitionContribution: (id, to, _mode) => client(`/api/contributions/${encodeURIComponent(id)}/transition`, { method: 'POST', body: { to } })
  }
}
