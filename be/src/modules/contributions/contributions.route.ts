import { Router, type RequestHandler } from 'express'
import * as controller from './contributions.controller.ts'
import * as middleware from './contributions.middleware.ts'
import type { ContributionsDeps } from './contributions.types.ts'
export function contributionsRoutes(deps: ContributionsDeps, auth: RequestHandler, guestOrUser: RequestHandler) {
  const router = Router()
  router.post('/api/projects/:id/contributions', auth, middleware.projectId, middleware.commitBodyInput, controller.commitContribution(deps))
  router.post('/api/contributions/:id/transition', auth, middleware.contributionId, middleware.transitionBodyInput, controller.transitionContribution(deps))
  return router
}
