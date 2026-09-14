import type { RequestHandler } from 'express'
import type { UsersDeps } from './users.types.ts'
import { listMembers } from './users.service.ts'
export const listMembersController = (deps: UsersDeps): RequestHandler => async (_req, res) => { res.json(await listMembers(deps)) }
