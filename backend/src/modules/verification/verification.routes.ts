import { Router } from 'express'
import { z } from 'zod'
import type { AppDeps } from '../../app.ts'
import { idParam, parseBody, str } from '../../common/validation.ts'
import { currentUser, requireAuth } from '../auth/auth.middleware.ts'
import { projectNotFound } from '../projects/projects.service.ts'
import * as verification from './verification.service.ts'

const reviewBody = z.object({ decision: z.enum(['approve', 'reject']), reason: str(1000).optional() })

export function verificationRoutes(deps: AppDeps): Router {
  const router = Router()
  const auth = requireAuth(deps)

  router.get('/api/verification-queue', auth, async (_req, res) => {
    res.json(await verification.listQueue(deps.db, currentUser(res)))
  })

  router.post('/api/projects/:id/submit', auth, async (req, res) => {
    const id = idParam(req.params.id, projectNotFound)
    res.json(await verification.submitProject(deps, currentUser(res), id))
  })

  router.post('/api/projects/:id/review', auth, async (req, res) => {
    const id = idParam(req.params.id, projectNotFound)
    const input = parseBody(reviewBody, req.body)
    res.json(await verification.reviewProject(deps, currentUser(res), id, input))
  })

  return router
}
