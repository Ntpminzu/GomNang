import type { RequestHandler, Response } from 'express'
import type { UserRow } from '@gomnang/shared/types.ts'
import type { AppDeps } from '../../app.ts'
import { HttpError } from '../../common/errors.ts'
import { userFromAuthorization } from './auth.service.ts'

/** Có token thì gắn người dùng vào request; không có thì đi tiếp với tư cách khách. */
export function optionalAuth(deps: AppDeps): RequestHandler {
  return async (req, res, next) => {
    res.locals.user = await userFromAuthorization(req.get('authorization'), deps.db, deps.secret)
    next()
  }
}

export function requireAuth(deps: AppDeps): RequestHandler {
  return async (req, res, next) => {
    const user = await userFromAuthorization(req.get('authorization'), deps.db, deps.secret)
    if (!user) throw new HttpError(401, 'AUTH_REQUIRED', 'Cần đăng nhập để thực hiện thao tác này.')
    res.locals.user = user
    next()
  }
}

/** Người đang đăng nhập. Chỉ gọi sau `requireAuth`. */
export function currentUser(res: Response): UserRow {
  const user = res.locals.user as UserRow | null | undefined
  if (!user) throw new HttpError(401, 'AUTH_REQUIRED', 'Cần đăng nhập để thực hiện thao tác này.')
  return user
}

/** Người đang đăng nhập, hoặc `null` nếu là khách. Dùng sau `optionalAuth`. */
export function maybeUser(res: Response): UserRow | null {
  return (res.locals.user as UserRow | null | undefined) ?? null
}
