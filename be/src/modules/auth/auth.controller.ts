import type { RequestHandler } from 'express'
import { inputOf } from '../../common/middleware/validation.ts'
import { login } from './auth.service.ts'
import type { AuthDeps, LoginInput } from './auth.types.ts'
export const loginController = (deps: AuthDeps): RequestHandler => async (_req, res) => {
  res.json(await login(inputOf<LoginInput>(res), deps))
}
