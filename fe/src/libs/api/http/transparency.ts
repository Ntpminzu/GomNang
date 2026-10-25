import type { ApiAdapter } from '../contracts.ts'
import type { RequestClient } from '../client.ts'
export function transparencyHttp(client: RequestClient): Pick<ApiAdapter, 'postUpdate' | 'recordExpense' | 'reviewExpense' | 'uploadReceipt' | 'getFile'> {
  return {
    postUpdate: (projectId, input, _mode) => client(`/api/projects/${encodeURIComponent(projectId)}/updates`, { method: 'POST', body: input }),
    recordExpense: (projectId, input, _mode) => client(`/api/projects/${encodeURIComponent(projectId)}/expenses`, { method: 'POST', body: input }),
    reviewExpense: (id, input, _mode) => client(`/api/expenses/${encodeURIComponent(id)}/review`, { method: 'POST', body: input }),
    // Mạng di động chậm có thể cần lâu hơn 15 giây mặc định để gửi 3 MB.
    uploadReceipt: (projectId, blob, name, _mode) =>
      client(`/api/projects/${encodeURIComponent(projectId)}/receipts`, { method: 'POST', file: { blob, name }, timeoutMs: 60_000 }),
    getFile: (id, _mode) => client(`/api/files/${encodeURIComponent(id)}`, { responseType: 'blob', timeoutMs: 60_000 }),
  }
}
