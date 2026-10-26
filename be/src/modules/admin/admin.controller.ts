import type { RequestHandler } from 'express'
import { inputOf } from '../../common/middleware/validation.ts'
import { currentUser } from '../auth/auth.middleware.ts'
import { createVerifier, resolveAiUsageRange } from './admin.service.ts'
import type { AdminDeps, CreateVerifierInput } from './admin.types.ts'
export const createVerifierController = (deps: AdminDeps): RequestHandler => async (_req, res) => {
  res.status(201).json(await createVerifier(inputOf<CreateVerifierInput>(res), currentUser(res).id, deps))
}
export const listVerifiersController = (deps: AdminDeps): RequestHandler => async (_req, res) => {
  res.json(await deps.admin.listVerifiers(deps.db))
}
export const aiUsageController = (deps: AdminDeps): RequestHandler => async (req, res) => {
  res.json(await deps.admin.getAiUsage(deps.db, resolveAiUsageRange(req.query, new Date())))
}
