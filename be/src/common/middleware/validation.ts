import type { RequestHandler, Response } from 'express'
import { z } from 'zod'
import { HttpError } from '../errors/http-error.ts'
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body)
  if (!result.success) {
    const details = Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.') || '(body)', issue.message]))
    throw new HttpError(400, 'BAD_REQUEST', 'Request không đúng định dạng.', details)
  }
  return result.data
}

export function validateBody<T extends z.ZodType>(schema: T): RequestHandler {
  return (req, res, next) => { res.locals.input = parseBody(schema, req.body); next() }
}
export function validateId(code: string, message: string): RequestHandler {
  return (req, res, next) => {
    const parsed = z.uuid().safeParse(req.params.id)
    if (!parsed.success) throw new HttpError(404, code, message)
    res.locals.resourceId = parsed.data
    next()
  }
}
export const inputOf = <T>(res: Response): T => res.locals.input as T
export const idOf = (res: Response): string => res.locals.resourceId as string
