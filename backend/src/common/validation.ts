import { z } from 'zod'
import { HttpError } from './errors.ts'

// Kiểm ĐỊNH DẠNG request ở tầng HTTP → 400. Đúng định dạng rồi mới tới lượt quy tắc nghiệp vụ (403 / 409 / 422).

export const MAX_QUANTITY = 10_000_000

/** Chuỗi đã cắt khoảng trắng hai đầu, có giới hạn độ dài. */
export const str = (max: number) => z.string().trim().max(max)

export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body)
  if (!result.success) {
    const details = Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.') || '(body)', issue.message]))
    throw new HttpError(400, 'BAD_REQUEST', 'Request không đúng định dạng.', details)
  }
  return result.data
}

/**
 * Mã sai định dạng thì coi như không tồn tại, thay vì để PostgreSQL báo lỗi cú pháp uuid thành 500.
 * Nhận `unknown` vì Express 5 khai báo tham số đường dẫn có thể là mảng.
 */
export function idParam(value: unknown, notFound: () => HttpError): string {
  const parsed = z.uuid().safeParse(value)
  if (!parsed.success) throw notFound()
  return parsed.data
}
