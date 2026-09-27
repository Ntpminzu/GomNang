import type { RequestHandler } from 'express'
import { idOf } from '../../common/middleware/validation.ts'
import { currentUser } from '../auth/auth.middleware.ts'
import * as service from './dashboard.service.ts'
import type { DashboardDeps } from './dashboard.types.ts'

export const myDashboard = (deps: DashboardDeps): RequestHandler => async (_req, res) => {
  res.json(await service.myDashboard(deps, currentUser(res)))
}

export const profile = (deps: DashboardDeps): RequestHandler => async (_req, res) => {
  res.json(await service.profile(deps, idOf(res)))
}
