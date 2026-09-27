import type { ApiAdapter } from '../contracts.ts'
import type { RequestClient } from '../client.ts'
export function transparencyHttp(client: RequestClient): Pick<ApiAdapter, 'postUpdate' | 'recordExpense' | 'reviewExpense'> {
  return {
    postUpdate: (projectId, input, _mode) => client(`/api/projects/${encodeURIComponent(projectId)}/updates`, { method: 'POST', body: input }),
    recordExpense: (projectId, input, _mode) => client(`/api/projects/${encodeURIComponent(projectId)}/expenses`, { method: 'POST', body: input }),
    reviewExpense: (id, input, _mode) => client(`/api/expenses/${encodeURIComponent(id)}/review`, { method: 'POST', body: input }),
  }
}
