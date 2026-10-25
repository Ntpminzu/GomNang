import { Router, type RequestHandler } from 'express'
import * as controller from './projects.controller.ts'
import * as middleware from './projects.middleware.ts'
import type { ProjectsDeps } from './projects.types.ts'
export function projectsRoutes(deps: ProjectsDeps, auth: RequestHandler, guestOrUser: RequestHandler) {
  const router = Router()
  router.get('/api/projects', controller.listProjects(deps))
  router.get('/api/projects/:id', guestOrUser, middleware.projectId, controller.getProject(deps))
  router.post('/api/projects', auth, middleware.projectBodyInput, controller.createProject(deps))
  router.put('/api/projects/:id', auth, middleware.projectId, middleware.projectBodyInput, controller.updateProject(deps))
  router.delete('/api/projects/:id', auth, middleware.projectId, controller.deleteProject(deps))
  router.post('/api/projects/:id/start', auth, middleware.projectId, controller.startProject(deps))
  router.post('/api/projects/:id/complete', auth, middleware.projectId, middleware.completeBodyInput, controller.completeProject(deps))
  router.post('/api/projects/:id/cancel', auth, middleware.projectId, middleware.cancelBodyInput, controller.cancelProject(deps))
  return router
}
