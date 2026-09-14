import { Router, type Request, type RequestHandler, type Response } from 'express'
import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'
import type { UserRow } from '@gomnang/domain/types.ts'
import { toMember } from '@gomnang/domain/views.ts'
import type { AppDeps } from './app.ts'
import { findUser, findUserByEmail } from './db/repo.ts'
import { HttpError, log, parseBody } from './http.ts'

/**
 * Xác thực bằng JWT ký HS256.
 *
 * Tuần 4 phát token qua /api/auth/dev-login (đăng nhập bằng email của tài khoản mẫu, không mật khẩu).
 * Endpoint này luôn bị tắt khi NODE_ENV=production. Khi nối Supabase Auth, chỉ thay nơi phát token —
 * middleware kiểm tra token bên dưới giữ nguyên cách dùng.
 */

const ISSUER = 'gomnang-api'
const TOKEN_TTL = '8h'

export async function signToken(userId: string, secret: Uint8Array): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secret)
}

async function userFromRequest(req: Request, deps: AppDeps): Promise<UserRow | null> {
  const header = req.get('authorization')
  if (!header) return null

  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Header Authorization phải có dạng "Bearer <token>".')
  }

  try {
    // Chỉ chấp nhận HS256: chặn kiểu tấn công đổi thuật toán trong header token.
    const { payload } = await jwtVerify(token, deps.secret, { issuer: ISSUER, algorithms: ['HS256'] })
    const user = payload.sub && z.uuid().safeParse(payload.sub).success ? await findUser(deps.db, payload.sub) : null
    if (!user) throw new Error('token trỏ tới tài khoản không tồn tại')
    return user
  } catch (err) {
    log('warn', 'token rejected', { reason: (err as Error).message })
    throw new HttpError(401, 'INVALID_TOKEN', 'Token không hợp lệ hoặc đã hết hạn. Đăng nhập lại.')
  }
}

/** Có token thì gắn người dùng vào request; không có thì đi tiếp với tư cách khách. */
export function optionalAuth(deps: AppDeps): RequestHandler {
  return async (req, res, next) => {
    res.locals.user = await userFromRequest(req, deps)
    next()
  }
}

export function requireAuth(deps: AppDeps): RequestHandler {
  return async (req, res, next) => {
    const user = await userFromRequest(req, deps)
    if (!user) throw new HttpError(401, 'AUTH_REQUIRED', 'Cần đăng nhập để thực hiện thao tác này.')
    res.locals.user = user
    next()
  }
}

export function currentUser(res: Response): UserRow {
  const user = res.locals.user as UserRow | null | undefined
  if (!user) throw new HttpError(401, 'AUTH_REQUIRED', 'Cần đăng nhập để thực hiện thao tác này.')
  return user
}

export function maybeUser(res: Response): UserRow | null {
  return (res.locals.user as UserRow | null | undefined) ?? null
}

export function authRoutes(deps: AppDeps): Router {
  const router = Router()

  router.post('/api/auth/dev-login', async (req, res) => {
    if (!deps.devLoginEnabled) throw new HttpError(404, 'NOT_FOUND', 'Không có endpoint POST /api/auth/dev-login.')

    const { email } = parseBody(z.object({ email: z.email() }), req.body)
    const user = await findUserByEmail(deps.db, email.toLowerCase())
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', `Không có tài khoản mẫu nào dùng email ${email}.`)

    log('info', 'dev login', { userId: user.id })
    res.json({ token: await signToken(user.id, deps.secret), user: { ...toMember(user), email: user.email } })
  })

  return router
}
