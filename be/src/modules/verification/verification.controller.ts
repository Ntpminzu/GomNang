import type { RequestHandler } from 'express'
import { idOf, inputOf } from '../../common/middleware/validation.ts'
import { currentUser, maybeUser } from '../auth/auth.middleware.ts'
import type { ProjectInput, ReviewInput, CommitInput, TransitionTarget } from '@gomnang/domain/types.ts'
import type { AiAssessmentInput } from './verification.schema.ts'
import * as service from './verification.service.ts'
import type { VerificationDeps } from './verification.types.ts'

export const getQueue = (deps: VerificationDeps): RequestHandler => async (_req, res) => {
  const result = await service.getQueue(deps, currentUser(res))
  res.json(result)
}

export const submitProject = (deps: VerificationDeps): RequestHandler => async (_req, res) => {
  const result = await service.submitProject(deps, idOf(res), currentUser(res))
  res.json(result)
}

export const reviewProject = (deps: VerificationDeps): RequestHandler => async (_req, res) => {
  const result = await service.reviewProject(deps, idOf(res), inputOf<ReviewInput>(res), currentUser(res))
  res.json(result)
}

export const requestAiAssessment = (deps: VerificationDeps): RequestHandler => async (_req, res) => {
  res.json(await service.requestAiAssessment(deps, idOf(res), inputOf<AiAssessmentInput>(res), currentUser(res)))
}
