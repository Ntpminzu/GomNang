import type { RequestHandler } from 'express'
import { idOf, inputOf } from '../../common/middleware/validation.ts'
import { currentUser, maybeUser } from '../auth/auth.middleware.ts'
import type { ProjectInput, ReviewInput, CommitInput, TransitionTarget } from '@gomnang/domain/types.ts'
import * as service from './projects.service.ts'
import type { ProjectsDeps } from './projects.types.ts'

export const listProjects = (deps: ProjectsDeps): RequestHandler => async (_req, res) => {
  const result = await service.listProjects(deps)
  res.json(result)
}

export const getProject = (deps: ProjectsDeps): RequestHandler => async (_req, res) => {
  const result = await service.getProject(deps, idOf(res), maybeUser(res))
  res.json(result)
}

export const createProject = (deps: ProjectsDeps): RequestHandler => async (_req, res) => {
  const result = await service.createProject(deps, inputOf<ProjectInput>(res), currentUser(res))
  res.status(201).location(`/api/projects/${result!.id}`).json(result)
}

export const updateProject = (deps: ProjectsDeps): RequestHandler => async (_req, res) => {
  const result = await service.updateProject(deps, idOf(res), inputOf<ProjectInput>(res), currentUser(res))
  res.json(result)
}
