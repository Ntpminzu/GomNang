import type { ErrorRequestHandler, RequestHandler } from 'express'
import type { RuleResult } from '@gomnang/shared/rules.ts'
import { log } from './logger.ts'

/** Lỗi mang sẵn mã HTTP. Mọi lỗi trả về cùng một hình dạng { error: { code, message, details? } }. */
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
 * Đổi kết quả quy tắc nghiệp vụ trong shared/rules.ts sang mã HTTP. Bảng đầy đủ: docs/api-contract.md §2.
 *   forbidden → 403: biết bạn là ai, nhưng bạn không có quyền làm việc này
 *   conflict  → 409: yêu cầu hợp lệ, nhưng trạng thái hiện tại của dữ liệu không cho phép
 *   invalid   → 422: đúng định dạng, nhưng giá trị vi phạm quy tắc nghiệp vụ
 */
const STATUS_BY_KIND = { forbidden: 403, conflict: 409, invalid: 422 } as const

export function ensure(result: RuleResult): void {
  if (!result.ok) throw new HttpError(STATUS_BY_KIND[result.kind], result.code, result.message)
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
