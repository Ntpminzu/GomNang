import type { RuleResult } from '@gomnang/domain/rules.ts'

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


const STATUS_BY_KIND = { forbidden: 403, conflict: 409, invalid: 422 } as const

export function ensure(result: RuleResult): void {
  if (!result.ok) throw new HttpError(STATUS_BY_KIND[result.kind], result.code, result.message)
}
