import type { ApiAdapter } from '../contracts.ts'
import type { RequestClient } from '../client.ts'
export function projectsHttp(client: RequestClient): Pick<ApiAdapter, 'listProjects' | 'getProject' | 'createProject' | 'updateProject' | 'deleteProject' | 'startProject' | 'completeProject' | 'cancelProject'> {
  return {
    listProjects: (_mode) => client('/api/projects'),
    getProject: (id, _mode) => client(`/api/projects/${encodeURIComponent(id)}`),
    createProject: (input, _mode) => client('/api/projects', { method: 'POST', body: input }),
    updateProject: (id, input, _mode) => client(`/api/projects/${encodeURIComponent(id)}`, { method: 'PUT', body: input }),
    deleteProject: async (id, _mode) => {
      await client(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
    },
    startProject: (id, _mode) => client(`/api/projects/${encodeURIComponent(id)}/start`, { method: 'POST' }),
    completeProject: (id, input, _mode) => client(`/api/projects/${encodeURIComponent(id)}/complete`, { method: 'POST', body: input }),
    cancelProject: (id, input, _mode) => client(`/api/projects/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: input })
  }
}
