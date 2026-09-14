import { Router, type RequestHandler } from 'express'
import type { UsersDeps } from './users.types.ts'
import { listMembersController } from './users.controller.ts'
export function usersRoutes(deps: UsersDeps, auth: RequestHandler) {
  const router = Router()
  router.get('/api/users', auth, listMembersController(deps))
  return router
}
