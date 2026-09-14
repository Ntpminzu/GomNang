import type { Member, ProjectDetail, ProjectInput, ProjectSummary } from '@gomnang/shared/types.ts'
import { request, seg } from '../../lib/api-client.ts'

/** GET /api/projects */
export const listProjects = () => request<ProjectSummary[]>('GET', '/api/projects')

/** GET /api/projects/{id} */
export const getProject = (id: string) => request<ProjectDetail>('GET', `/api/projects/${seg(id)}`)

/** POST /api/projects */
export const createProject = (input: ProjectInput) => request<ProjectDetail>('POST', '/api/projects', input)

/** PUT /api/projects/{id} */
export const updateProject = (id: string, input: ProjectInput) =>
  request<ProjectDetail>('PUT', `/api/projects/${seg(id)}`, input)

/** GET /api/users — danh sách thành viên để chọn người phụ trách tài chính trên form dự án. */
export const listMembers = () => request<Member[]>('GET', '/api/users')
