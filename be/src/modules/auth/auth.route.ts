import { Router } from 'express'
import { validateBody } from '../../common/middleware/validation.ts'
import { requireAuth, requireDevLogin } from './auth.middleware.ts'
import { loginBody, registerBody, loginPasswordBody, changePasswordBody } from './auth.schema.ts'
import { loginController, registerController, loginPasswordController, optionsController, meController, logoutController, changePasswordController } from './auth.controller.ts'
import { mountGoogleRoutes } from './auth.oauth.controller.ts'
import type { AuthDeps } from './auth.types.ts'
export function authRoutes(deps: AuthDeps) {
  const router = Router()
  const authenticated = requireAuth(deps)
  router.use('/api/auth', (_req, res, next) => { res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }); next() })
  router.get('/api/auth/options', optionsController(deps))
  router.post('/api/auth/dev-login', requireDevLogin(deps.devLoginEnabled), validateBody(loginBody), loginController(deps))
  router.post('/api/auth/register', validateBody(registerBody), registerController(deps))
  router.post('/api/auth/login', validateBody(loginPasswordBody), loginPasswordController(deps))
  router.get('/api/auth/me', authenticated, meController)
  router.post('/api/auth/logout', authenticated, logoutController(deps))
  router.post('/api/auth/change-password', authenticated, validateBody(changePasswordBody), changePasswordController(deps))
  mountGoogleRoutes(router, deps)
  return router
}
