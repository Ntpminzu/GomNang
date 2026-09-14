import { sql } from 'drizzle-orm'
import express from 'express'
import { toMember } from '@gomnang/domain/views.ts'
import { authRoutes, requireAuth } from './auth.ts'
import type { Db } from './db/client.ts'
import { listUsers } from './db/repo.ts'
import { errorHandler, log, notFound, requestLog } from './http.ts'
import { projectRoutes } from './routes.ts'

export type AppDeps = {
  db: Db
  secret: Uint8Array
  devLoginEnabled: boolean
  /** Ngày hôm nay dạng YYYY-MM-DD. Truyền vào để test cố định được ngày. */
  today: () => string
}

/** Dựng ứng dụng Express. Không tự mở cổng — server.ts và bộ test tự quyết định chạy ở đâu. */
export function createApp(deps: AppDeps) {
  const app = express()
  const startedAt = Date.now()

  app.disable('x-powered-by')
  app.use(requestLog)
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

  app.get('/api/users', requireAuth(deps), async (_req, res) => {
    res.json((await listUsers(deps.db)).map(toMember))
  })

  app.use(projectRoutes(deps))

  app.use(notFound)
  app.use(errorHandler)
  return app
}
