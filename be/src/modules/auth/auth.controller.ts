import type { RequestHandler } from 'express'
import { inputOf } from '../../common/middleware/validation.ts'
import { toMember } from '@gomnang/domain/views.ts'
import { login, register, loginWithPassword, changePassword, endSession } from './auth.service.ts'
import { currentAuth } from './auth.middleware.ts'
import type { AuthDeps, LoginInput, RegisterInput, LoginPasswordInput, ChangePasswordInput } from './auth.types.ts'
export const loginController = (deps: AuthDeps): RequestHandler => async (_req, res) => {
  res.json(await login(inputOf<LoginInput>(res), deps))
}
export const registerController = (deps: AuthDeps): RequestHandler => async (_req, res) => {
  res.status(201).json(await register(inputOf<RegisterInput>(res), deps))
}
export const loginPasswordController = (deps: AuthDeps): RequestHandler => async (_req, res) => {
  res.json(await loginWithPassword(inputOf<LoginPasswordInput>(res), deps))
}
export const optionsController = (deps: AuthDeps): RequestHandler => (_req, res) => {
  res.json({ googleEnabled: !!deps.google, devLoginEnabled: deps.devLoginEnabled })
}
export const meController: RequestHandler = (_req, res) => {
  const { user } = currentAuth(res)
  res.json({ user: { ...toMember(user), email: user.email } })
}
export const logoutController = (deps: AuthDeps): RequestHandler => async (_req, res) => {
  await endSession(currentAuth(res), deps)
  res.status(204).end()
}
export const changePasswordController = (deps: AuthDeps): RequestHandler => async (_req, res) => {
  res.json(await changePassword(currentAuth(res), inputOf<ChangePasswordInput>(res), deps))
}
