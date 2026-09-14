import type { RequestHandler, Response } from 'express'
import { HttpError } from '../../common/errors/http-error.ts'
import { authenticate } from './auth.service.ts'
import type { AuthDeps, AuthUser } from './auth.types.ts'

export function optionalAuth(deps: AuthDeps): RequestHandler {
  return async (req, res, next) => {
    res.locals.user = await authenticate(req.get('authorization'), deps)
    next()
  }
}

export function requireAuth(deps: AuthDeps): RequestHandler {
  return async (req, res, next) => {
    const user = await authenticate(req.get('authorization'), deps)
    if (!user) throw new HttpError(401, 'AUTH_REQUIRED', 'Cần đăng nhập để thực hiện thao tác này.')
    res.locals.user = user
    next()
  }
}

export function currentUser(res: Response): AuthUser {
  const user = res.locals.user as AuthUser | null | undefined
  if (!user) throw new HttpError(401, 'AUTH_REQUIRED', 'Cần đăng nhập để thực hiện thao tác này.')
  return user
}

export function maybeUser(res: Response): AuthUser | null {
  return (res.locals.user as AuthUser | null | undefined) ?? null
}

export function requireDevLogin(enabled: boolean): RequestHandler {
  return (_req, _res, next) => {
    if (!enabled) throw new HttpError(404, 'NOT_FOUND', 'Không có endpoint POST /api/auth/dev-login.')
    next()
  }
}
