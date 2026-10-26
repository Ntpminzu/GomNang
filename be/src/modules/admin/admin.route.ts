import { Router, type RequestHandler } from 'express'
import { requireAdmin } from '../auth/auth.middleware.ts'
import { validateBody } from '../../common/middleware/validation.ts'
import { createVerifierBody } from './admin.schema.ts'
import { aiUsageController, createVerifierController, listVerifiersController } from './admin.controller.ts'
import type { AdminDeps } from './admin.types.ts'
export function adminRoutes(deps: AdminDeps, auth: RequestHandler) {
  const router = Router()
  router.use('/api/admin', auth, requireAdmin, (_req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
  router.get('/api/admin/verifiers', listVerifiersController(deps))
  router.get('/api/admin/ai-usage', aiUsageController(deps))
  router.post('/api/admin/verifiers', validateBody(createVerifierBody), createVerifierController(deps))
  return router
}
