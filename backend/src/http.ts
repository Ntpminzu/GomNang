import { randomUUID } from 'node:crypto'
import type { ErrorRequestHandler, RequestHandler } from 'express'
import type { z } from 'zod'
import type { RuleResult } from '@gomnang/shared/rules.ts'

// ---------------------------------------------------------------------------
// Log: mỗi dòng là một object JSON, để lọc được bằng máy (grep, jq, dịch vụ log).
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// CORS: web chạy ở origin khác API, nên trình duyệt chỉ cho gọi khi API gửi đúng header.
// Không dùng thư viện `cors`: chỉ cần vài header. Origin lạ thì không nhận header nào,
// trình duyệt tự chặn. Công cụ như curl không bị CORS ảnh hưởng — CORS không phải lớp bảo mật của API.
// ---------------------------------------------------------------------------

export function cors(allowedOrigins: readonly string[]): RequestHandler {
  const allowed = new Set(allowedOrigins)
  return (req, res, next) => {
    const origin = req.get('origin')
    if (origin && allowed.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Expose-Headers', 'x-request-id, location')
    }
    res.setHeader('Vary', 'Origin')

    // Preflight: trình duyệt hỏi trước khi gửi request có header Authorization hoặc body JSON.
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT')
      res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization')
      res.setHeader('Access-Control-Max-Age', '600')
      res.status(204).end()
      return
    }
    next()
  }
}

// ---------------------------------------------------------------------------
// Lỗi: mọi lỗi trả về cùng một hình dạng { error: { code, message, details? } }.
// ---------------------------------------------------------------------------

export class HttpError extends Error {
  status: number
  code: string
  details: Record<string, string> | undefined

  constructor(status: number, code: string, message: string, details?: Record<string, string>) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

/**
 * Đổi kết quả quy tắc nghiệp vụ sang mã HTTP. Xem bảng chính sách mã trạng thái trong docs/api-contract.md.
 *   forbidden → 403: biết bạn là ai, nhưng bạn không có quyền làm việc này
 *   conflict  → 409: yêu cầu hợp lệ, nhưng trạng thái hiện tại của dữ liệu không cho phép
 *   invalid   → 422: đúng định dạng, nhưng giá trị vi phạm quy tắc nghiệp vụ
 */
const STATUS_BY_KIND = { forbidden: 403, conflict: 409, invalid: 422 } as const

export function ensure(result: RuleResult): void {
  if (!result.ok) throw new HttpError(STATUS_BY_KIND[result.kind], result.code, result.message)
}

/** Sai định dạng (thiếu trường, sai kiểu, quá dài) → 400. Đúng định dạng mới tới lượt quy tắc nghiệp vụ. */
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body)
  if (!result.success) {
    const details = Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.') || '(body)', issue.message]))
    throw new HttpError(400, 'BAD_REQUEST', 'Request không đúng định dạng.', details)
  }
  return result.data
}

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
