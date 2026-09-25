import type { RequestHandler } from 'express'
import { idOf, inputOf } from '../../common/middleware/validation.ts'
import { currentUser, maybeUser } from '../auth/auth.middleware.ts'
import type { ProjectInput, ReviewInput, CommitInput, TransitionTarget } from '@gomnang/domain/types.ts'
import * as service from './contributions.service.ts'
import type { ContributionsDeps } from './contributions.types.ts'

export const commitContribution = (deps: ContributionsDeps): RequestHandler => async (_req, res) => {
  const result = await service.commitContribution(deps, idOf(res), inputOf<CommitInput>(res), currentUser(res))
  res.status(201).json(result)
}

export const transitionContribution = (deps: ContributionsDeps): RequestHandler => async (_req, res) => {
  const result = await service.transitionContribution(deps, idOf(res), inputOf<{ to: TransitionTarget }>(res).to, currentUser(res))
  res.json(result)
}
