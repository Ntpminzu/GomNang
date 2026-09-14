import type { CommitInput, Contribution, TransitionTarget } from '@gomnang/shared/types.ts'
import { request, seg } from '../../lib/api-client.ts'

/** POST /api/projects/{id}/contributions */
export const commitContribution = (projectId: string, input: CommitInput) =>
  request<Contribution>('POST', `/api/projects/${seg(projectId)}/contributions`, input)

/** POST /api/contributions/{id}/transition */
export const transitionContribution = (id: string, to: TransitionTarget) =>
  request<Contribution>('POST', `/api/contributions/${seg(id)}/transition`, { to })
