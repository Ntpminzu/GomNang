import type { ApiAdapter } from '../contracts.ts'
import type { RequestClient } from '../client.ts'
export function dashboardHttp(client: RequestClient): Pick<ApiAdapter, 'getMyDashboard' | 'getProfile'> {
  return {
    getMyDashboard: (_mode) => client('/api/me/dashboard'),
    getProfile: (id, _mode) => client(`/api/users/${encodeURIComponent(id)}/profile`),
  }
}
