import type { ErrorRequestHandler, RequestHandler } from 'express'
import { HttpError } from '../errors/http-error.ts'
import { log } from '../../infrastructure/logging/logger.ts'

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Không có endpoint ${req.method} ${req.path}.` } })
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } })
    return
  }
  // Lỗi do express.json() ném ra khi đọc body.
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'MALFORMED_JSON', message: 'Body không phải JSON hợp lệ.' } })
    return
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Body vượt quá 100 KB.' } })
    return
  }

  // Lỗi không lường trước: ghi đầy đủ vào log, nhưng không để lộ chi tiết cho client.
  log('error', 'unhandled error', { requestId: res.locals.requestId, error: err?.message, stack: err?.stack })
  res.status(500).json({
    error: { code: 'INTERNAL', message: `Lỗi máy chủ. Mã tra cứu: ${res.locals.requestId}` },
  })
}
