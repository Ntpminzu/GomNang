import type { RequestHandler, Response } from 'express'
import { HttpError } from '../../common/errors/http-error.ts'
import { authenticate } from './auth.service.ts'
import type { AuthContext, AuthDeps, AuthUser } from './auth.types.ts'
export function optionalAuth(deps: AuthDeps): RequestHandler {
  return async (req, res, next) => {
    const context = await authenticate(req.get('authorization'), deps)
    res.locals.user = context?.user ?? null
    res.locals.auth = context
    next()
  }
}
export function requireAuth(deps: AuthDeps): RequestHandler {
  return async (req, res, next) => {
    const context = await authenticate(req.get('authorization'), deps)
    if (!context) throw new HttpError(401, 'AUTH_REQUIRED', 'Cần đăng nhập để thực hiện thao tác này.')
    res.locals.user = context.user
    res.locals.auth = context
    next()
  }
}
export function currentUser(res: Response): AuthUser {
  if (!res.locals.user) throw new HttpError(401, 'AUTH_REQUIRED', 'Cần đăng nhập để thực hiện thao tác này.')
  return res.locals.user as AuthUser
}
export const currentAuth = (res: Response) => res.locals.auth as AuthContext
export const maybeUser = (res: Response) => (res.locals.user as AuthUser | null | undefined) ?? null
export const requireAdmin: RequestHandler = (_req, res, next) => {
  if (currentUser(res).role !== 'admin') throw new HttpError(403, 'ADMIN_REQUIRED', 'Chỉ quản trị viên được sử dụng chức năng này.')
  next()
}
export function requireDevLogin(enabled: boolean): RequestHandler {
  return (_req, _res, next) => {
    if (!enabled) throw new HttpError(404, 'NOT_FOUND', 'Không có endpoint POST /api/auth/dev-login.')
    next()
  }
}
