import { Router, type RequestHandler } from 'express'
import * as controller from './verification.controller.ts'
import * as middleware from './verification.middleware.ts'
import type { VerificationDeps } from './verification.types.ts'
export function verificationRoutes(deps: VerificationDeps, auth: RequestHandler, guestOrUser: RequestHandler) {
  const router = Router()
  router.get('/api/verification-queue', auth, controller.getQueue(deps))
  router.post('/api/projects/:id/submit', auth, middleware.projectId, controller.submitProject(deps))
  router.post('/api/projects/:id/review', auth, middleware.projectId, middleware.reviewBodyInput, controller.reviewProject(deps))
  router.post('/api/projects/:id/ai-assessment', auth, middleware.projectId, middleware.aiAssessmentBodyInput, controller.requestAiAssessment(deps))
  return router
}
