import { Router, type RequestHandler } from 'express'
import * as controller from './transparency.controller.ts'
import * as middleware from './transparency.middleware.ts'
import type { TransparencyDeps } from './transparency.types.ts'
export function transparencyRoutes(deps: TransparencyDeps, auth: RequestHandler) {
  const router = Router()
  router.post('/api/projects/:id/updates', auth, middleware.projectId, middleware.updateBodyInput, controller.postUpdate(deps))
  router.post('/api/projects/:id/expenses', auth, middleware.projectId, middleware.expenseBodyInput, controller.recordExpense(deps))
  router.post('/api/expenses/:id/review', auth, middleware.expenseId, middleware.expenseReviewBodyInput, controller.reviewExpense(deps))
  return router
}
