import { sql } from 'drizzle-orm'
import type { RequestHandler } from 'express'
import type { AppDeps } from '../common/types/dependencies.ts'
import { log } from '../infrastructure/logging/logger.ts'
export function healthController(deps: AppDeps): RequestHandler {
  const startedAt = Date.now()
  return async (_req, res) => {
    try {
      await deps.db.execute(sql`select 1`)
      res.json({ status: 'ok', db: 'ok', uptimeSeconds: Math.round((Date.now() - startedAt) / 1000) })
    } catch (err) {
      log('error', 'health check failed', { error: (err as Error).message })
      res.status(503).json({ status: 'degraded', db: 'down' })
    }
  }
}
