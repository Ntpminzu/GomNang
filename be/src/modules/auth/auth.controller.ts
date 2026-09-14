import type { RequestHandler } from 'express'
import { inputOf } from '../../common/middleware/validation.ts'
import { login, register, loginWithPassword } from './auth.service.ts'
import type { AuthDeps, LoginInput, RegisterInput, LoginPasswordInput } from './auth.types.ts'
export const loginController = (deps: AuthDeps): RequestHandler => async (_req, res) => {
  res.json(await login(inputOf<LoginInput>(res), deps))
}
export const registerController = (deps: AuthDeps): RequestHandler => async (_req, res) => {
  res.status(201).json(await register(inputOf<RegisterInput>(res), deps))
}
export const loginPasswordController = (deps: AuthDeps): RequestHandler => async (_req, res) => {
  res.json(await loginWithPassword(inputOf<LoginPasswordInput>(res), deps))
}
