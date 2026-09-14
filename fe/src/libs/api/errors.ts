export class ApiError extends Error {
  status: number
  code: string
  details: Record<string, string> | undefined

  constructor(status: number, code: string, message: string, details?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  return new ApiError(500, 'UNKNOWN', err instanceof Error ? err.message : 'Lỗi không xác định.')
}
