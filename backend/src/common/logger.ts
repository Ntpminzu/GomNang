import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'

// Mỗi dòng log là một object JSON, để lọc được bằng máy (grep, jq, dịch vụ log của nhà cung cấp hosting).

type Level = 'info' | 'warn' | 'error'

export function log(level: Level, msg: string, fields: Record<string, unknown> = {}) {
  if (process.env.LOG_SILENT === '1') return
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...fields })
  if (level === 'error') console.error(line)
  else console.log(line)
}

/** Ghi một dòng cho mỗi request khi đã trả lời xong: ai, gọi gì, mã trạng thái, mất bao lâu. */
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
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(performance.now() - started),
      userId: res.locals.user?.id ?? null,
    })
  })
  next()
}
