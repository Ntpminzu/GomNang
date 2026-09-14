import { Router } from 'express'
import { validateBody } from '../../common/middleware/validation.ts'
import { requireDevLogin } from './auth.middleware.ts'
import { loginBody } from './auth.schema.ts'
import { loginController } from './auth.controller.ts'
import type { AuthDeps } from './auth.types.ts'
export function authRoutes(deps: AuthDeps) {
  const router = Router()
  router.post('/api/auth/dev-login', requireDevLogin(deps.devLoginEnabled), validateBody(loginBody), loginController(deps))
  return router
}
