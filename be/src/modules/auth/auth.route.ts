import { Router } from 'express'
import { validateBody } from '../../common/middleware/validation.ts'
import { requireDevLogin } from './auth.middleware.ts'
import { loginBody, registerBody, loginPasswordBody } from './auth.schema.ts'
import { loginController, registerController, loginPasswordController } from './auth.controller.ts'
import type { AuthDeps } from './auth.types.ts'
export function authRoutes(deps: AuthDeps) {
  const router = Router()
  router.post('/api/auth/dev-login', requireDevLogin(deps.devLoginEnabled), validateBody(loginBody), loginController(deps))
  router.post('/api/auth/register', validateBody(registerBody), registerController(deps))
  router.post('/api/auth/login', validateBody(loginPasswordBody), loginPasswordController(deps))
  return router
}
