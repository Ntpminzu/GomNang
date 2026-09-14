import type { ApiAdapter } from '../contracts.ts'
import type { RequestClient } from '../client.ts'
export function usersHttp(client: RequestClient): Pick<ApiAdapter, 'listMembers'> {
  return {
    listMembers: (_mode) => client('/api/users')
  }
}
