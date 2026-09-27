import { Router, type RequestHandler } from 'express'
import { validateId } from '../../common/middleware/validation.ts'
import * as controller from './dashboard.controller.ts'
import type { DashboardDeps } from './dashboard.types.ts'
export function dashboardRoutes(deps: DashboardDeps, auth: RequestHandler) {
  const router = Router()
  router.get('/api/me/dashboard', auth, controller.myDashboard(deps))
  router.get('/api/users/:id/profile', validateId('USER_NOT_FOUND', 'Không tìm thấy người dùng.'), controller.profile(deps))
  return router
}
