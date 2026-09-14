import type { ProjectDetail, QueueItem, ReviewInput } from '@gomnang/shared/types.ts'
import { request, seg } from '../../lib/api-client.ts'

/** GET /api/verification-queue */
export const getVerificationQueue = () => request<QueueItem[]>('GET', '/api/verification-queue')

/** POST /api/projects/{id}/submit */
export const submitProject = (id: string) => request<ProjectDetail>('POST', `/api/projects/${seg(id)}/submit`)

/** POST /api/projects/{id}/review */
export const reviewProject = (id: string, input: ReviewInput) =>
  request<ProjectDetail>('POST', `/api/projects/${seg(id)}/review`, input)
