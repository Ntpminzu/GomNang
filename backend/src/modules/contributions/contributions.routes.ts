import { Router } from 'express'
import { z } from 'zod'
import type { AppDeps } from '../../app.ts'
import { MAX_QUANTITY, idParam, parseBody } from '../../common/validation.ts'
import { currentUser, requireAuth } from '../auth/auth.middleware.ts'
import { projectNotFound } from '../projects/projects.service.ts'
import * as contributions from './contributions.service.ts'

const commitBody = z.object({ needItemId: z.uuid(), quantity: z.number().max(MAX_QUANTITY) })
const transitionBody = z.object({ to: z.enum(['delivered', 'confirmed']) })

export function contributionsRoutes(deps: AppDeps): Router {
  const router = Router()
  const auth = requireAuth(deps)

  router.post('/api/projects/:id/contributions', auth, async (req, res) => {
    const projectId = idParam(req.params.id, projectNotFound)
    const input = parseBody(commitBody, req.body)
    res.status(201).json(await contributions.commitContribution(deps, currentUser(res), projectId, input))
  })

  router.post('/api/contributions/:id/transition', auth, async (req, res) => {
    const id = idParam(req.params.id, contributions.contributionNotFound)
    const { to } = parseBody(transitionBody, req.body)
    res.json(await contributions.transitionContribution(deps, currentUser(res), id, to))
  })

  return router
}
