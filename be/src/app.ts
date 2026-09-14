import express from 'express'
import type { AppDeps } from './common/types/dependencies.ts'
import { requestLog } from './common/middleware/request-log.ts'
import { errorHandler, notFound } from './common/middleware/error-handler.ts'
import { healthRoutes } from './health/health.route.ts'
import { authRoutes } from './modules/auth/auth.route.ts'
import { optionalAuth, requireAuth } from './modules/auth/auth.middleware.ts'
import { usersRoutes } from './modules/users/users.route.ts'
import { projectsRoutes } from './modules/projects/projects.route.ts'
import { verificationRoutes } from './modules/verification/verification.route.ts'
import { contributionsRoutes } from './modules/contributions/contributions.route.ts'
import * as users from './modules/users/users.repository.ts'
import * as projects from './modules/projects/projects.repository.ts'
import * as verification from './modules/verification/verification.repository.ts'
import * as contributions from './modules/contributions/contributions.repository.ts'
import * as audit from './infrastructure/audit/audit.repository.ts'

/** Composition root: routes receive explicit dependencies; services never import one another. */
export function createApp(deps: AppDeps) {
  const app = express()
  const authDeps = { ...deps, users }
  const auth = requireAuth(authDeps)
  const guest = optionalAuth(authDeps)
  app.disable('x-powered-by')
  app.use(requestLog)
  app.use(express.json({ limit: '100kb' }))
  app.use(healthRoutes(deps))
  app.use(authRoutes(authDeps))
  app.use(usersRoutes({ ...deps, users }, auth))
  app.use(projectsRoutes({ ...deps, users, projects, audit }, auth, guest))
  app.use(verificationRoutes({ ...deps, users, projects, verification, audit }, auth, guest))
  app.use(contributionsRoutes({ ...deps, projects, contributions, audit }, auth, guest))
  app.use(notFound)
  app.use(errorHandler)
  return app
}
