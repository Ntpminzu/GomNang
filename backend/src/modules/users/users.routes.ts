import { Router } from 'express'
import { toMember } from '@gomnang/shared/views.ts'
import type { AppDeps } from '../../app.ts'
import { requireAuth } from '../auth/auth.middleware.ts'
import { listUsers } from './users.repository.ts'

export function usersRoutes(deps: AppDeps): Router {
  const router = Router()

  // Module này không có quy tắc nghiệp vụ nào, nên route gọi thẳng repository — không cần service.
  // toMember bỏ email: danh sách thành viên hiện cho mọi người đã đăng nhập.
  router.get('/api/users', requireAuth(deps), async (_req, res) => {
    res.json((await listUsers(deps.db)).map(toMember))
  })

  return router
}
