import { sql } from 'drizzle-orm'
import express from 'express'
import { cors } from './common/cors.ts'
import { errorHandler, notFound } from './common/errors.ts'
import { log, requestLog } from './common/logger.ts'
import type { Db } from './db/client.ts'
import { authRoutes } from './modules/auth/auth.routes.ts'
import { contributionsRoutes } from './modules/contributions/contributions.routes.ts'
import { projectsRoutes } from './modules/projects/projects.routes.ts'
import { usersRoutes } from './modules/users/users.routes.ts'
import { verificationRoutes } from './modules/verification/verification.routes.ts'

export type AppDeps = {
  db: Db
  secret: Uint8Array
  devLoginEnabled: boolean
  corsOrigins: readonly string[]
  /** Ngày hôm nay dạng YYYY-MM-DD. Truyền vào để test cố định được ngày. */
  today: () => string
}

/**
 * Dựng ứng dụng Express. Không tự mở cổng — server.ts và bộ test tự quyết định chạy ở đâu.
 *
 * Mỗi tính năng là một thư mục trong modules/, gồm tối đa ba file:
 *   <tên>.routes.ts      đọc và kiểm định dạng request, trả mã HTTP
 *   <tên>.service.ts     quy tắc nghiệp vụ, transaction, sổ ghi vết
 *   <tên>.repository.ts  truy vấn database
 * Module không có quy tắc nghiệp vụ (users) thì không có service; module chỉ đọc ghi dữ liệu (audit) thì chỉ có repository.
 */
export function createApp(deps: AppDeps) {
  const app = express()
  const startedAt = Date.now()

  app.disable('x-powered-by')
  app.use(requestLog)
  app.use(cors(deps.corsOrigins))
  app.use(express.json({ limit: '100kb' }))

  app.get('/health', async (_req, res) => {
    try {
      await deps.db.execute(sql`select 1`)
      res.json({ status: 'ok', db: 'ok', uptimeSeconds: Math.round((Date.now() - startedAt) / 1000) })
    } catch (err) {
      log('error', 'health check failed', { error: (err as Error).message })
      res.status(503).json({ status: 'degraded', db: 'down' })
    }
  })

  app.use(authRoutes(deps))
  app.use(usersRoutes(deps))
  app.use(projectsRoutes(deps))
  app.use(verificationRoutes(deps))
  app.use(contributionsRoutes(deps))

  app.use(notFound)
  app.use(errorHandler)
  return app
}
