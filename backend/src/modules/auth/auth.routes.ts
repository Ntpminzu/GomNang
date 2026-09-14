import { Router } from 'express'
import { z } from 'zod'
import { toMember } from '@gomnang/shared/views.ts'
import type { AppDeps } from '../../app.ts'
import { HttpError } from '../../common/errors.ts'
import { parseBody } from '../../common/validation.ts'
import { devLogin } from './auth.service.ts'

export function authRoutes(deps: AppDeps): Router {
  const router = Router()

  router.post('/api/auth/dev-login', async (req, res) => {
    // Đang tắt thì trả lời như thể endpoint không tồn tại — kiểm trước cả việc đọc body.
    if (!deps.devLoginEnabled) throw new HttpError(404, 'NOT_FOUND', 'Không có endpoint POST /api/auth/dev-login.')

    const { email } = parseBody(z.object({ email: z.email() }), req.body)
    const { token, user } = await devLogin(deps.db, deps.secret, email)
    res.json({ token, user: { ...toMember(user), email: user.email } })
  })

  return router
}
