import { Router } from 'express'
import { z } from 'zod'
import { NEED_KINDS } from '@gomnang/shared/types.ts'
import type { AppDeps } from '../../app.ts'
import { MAX_QUANTITY, idParam, parseBody, str } from '../../common/validation.ts'
import { currentUser, maybeUser, optionalAuth, requireAuth } from '../auth/auth.middleware.ts'
import * as projects from './projects.service.ts'

// Route chỉ lo HTTP: đọc và kiểm định dạng request, gọi service, trả mã trạng thái. Quy tắc nằm ở service.

const projectBody = z.object({
  name: str(150),
  goal: str(2000),
  beneficiaryGroup: str(200),
  location: str(300),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  treasurerId: z
    .uuid()
    .nullish()
    .transform((v) => v ?? null),
  needItems: z
    .array(z.object({ label: str(100), unit: str(30), kind: z.enum(NEED_KINDS), targetQty: z.number().max(MAX_QUANTITY) }))
    .max(30),
})

export function projectsRoutes(deps: AppDeps): Router {
  const router = Router()
  const auth = requireAuth(deps)

  router.get('/api/projects', async (_req, res) => {
    res.json(await projects.listPublicProjects(deps.db))
  })

  router.get('/api/projects/:id', optionalAuth(deps), async (req, res) => {
    const id = idParam(req.params.id, projects.projectNotFound)
    res.json(await projects.getProjectDetail(deps.db, id, maybeUser(res)))
  })

  router.post('/api/projects', auth, async (req, res) => {
    const input = parseBody(projectBody, req.body)
    const detail = await projects.createProject(deps, currentUser(res), input)
    res.status(201).location(`/api/projects/${detail.id}`).json(detail)
  })

  router.put('/api/projects/:id', auth, async (req, res) => {
    const id = idParam(req.params.id, projects.projectNotFound)
    const input = parseBody(projectBody, req.body)
    res.json(await projects.updateProject(deps, currentUser(res), id, input))
  })

  return router
}
