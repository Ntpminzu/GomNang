import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'
import { log, type Level } from '../../infrastructure/logging/logger.ts'

export const requestLog: RequestHandler = (req, res, next) => {
  const started = performance.now()
  const incoming = req.get('x-request-id')
  const requestId = incoming && /^[\w-]{1,100}$/.test(incoming) ? incoming : randomUUID()
  res.locals.requestId = requestId
  res.setHeader('x-request-id', requestId)

  res.on('finish', () => {
    const level: Level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
    log(level, 'request', {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(performance.now() - started),
      userId: res.locals.user?.id ?? null,
    })
  })
  next()
}
