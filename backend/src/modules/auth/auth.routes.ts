import { Router } from 'express'
import { z } from 'zod'
import { toMember } from '@gomnang/shared/views.ts'
import type { AppDeps } from '../../app.ts'
import { HttpError } from '../../common/errors.ts'
import { parseBody } from '../../common/validation.ts'
import type { UserRow } from '@gomnang/shared/types.ts'
import { devLogin, login, register } from './auth.service.ts'

/** Mọi cách đăng nhập trả cùng một hình dạng, nên frontend chỉ lưu một kiểu phiên. */
const session = (token: string, user: UserRow) => ({ token, user: { ...toMember(user), email: user.email } })

// Tầng HTTP chỉ bắt "phải là chuỗi" → 400. Độ dài thật, dạng email, độ dài mật khẩu do validate-auth.ts kiểm ở service → 422.
const text = z.string().max(1000)

export function authRoutes(deps: AppDeps): Router {
  const router = Router()

  router.post('/api/auth/dev-login', async (req, res) => {
    // Đang tắt thì trả lời như thể endpoint không tồn tại — kiểm trước cả việc đọc body.
    if (!deps.devLoginEnabled) throw new HttpError(404, 'NOT_FOUND', 'Không có endpoint POST /api/auth/dev-login.')

    const { email } = parseBody(z.object({ email: z.email() }), req.body)
    const { token, user } = await devLogin(deps.db, deps.secret, email)
    res.json(session(token, user))
  })

  router.post('/api/auth/register', async (req, res) => {
    const input = parseBody(z.object({ displayName: text, email: text, password: text }), req.body)
    const { token, user } = await register(deps.db, deps.secret, input)
    res.status(201).json(session(token, user))
  })

  router.post('/api/auth/login', async (req, res) => {
    const input = parseBody(z.object({ email: text, password: text }), req.body)
    const { token, user } = await login(deps.db, deps.secret, input)
    res.json(session(token, user))
  })

  return router
}
