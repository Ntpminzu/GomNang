import type { RequestHandler } from 'express'

/**
 * CORS: web chạy ở origin khác API, nên trình duyệt chỉ cho gọi khi API gửi đúng header.
 *
 * Không dùng thư viện `cors`: chỉ cần vài header. Origin lạ thì không nhận header nào, trình duyệt tự chặn.
 * Công cụ như curl không bị CORS ảnh hưởng — CORS không phải lớp bảo mật của API; lớp bảo mật là token và phân quyền.
 */
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
