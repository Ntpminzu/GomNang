import type { ApiAdapter } from '../contracts.ts'
import type { RequestClient } from '../client.ts'
export function projectsHttp(client: RequestClient): Pick<ApiAdapter, 'listProjects' | 'getProject' | 'createProject' | 'updateProject'> {
  return {
    listProjects: (_mode) => client('/api/projects'),
    getProject: (id, _mode) => client(`/api/projects/${encodeURIComponent(id)}`),
    createProject: (input, _mode) => client('/api/projects', { method: 'POST', body: input }),
    updateProject: (id, input, _mode) => client(`/api/projects/${encodeURIComponent(id)}`, { method: 'PUT', body: input })
  }
}
