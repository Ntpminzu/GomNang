import type { RequestHandler } from 'express'
import type { ExpenseInput, ExpenseReviewInput, UpdateInput } from '@gomnang/domain/types.ts'
import { idOf, inputOf } from '../../common/middleware/validation.ts'
import { currentUser, maybeUser } from '../auth/auth.middleware.ts'
import * as service from './transparency.service.ts'
import type { TransparencyDeps } from './transparency.types.ts'

export const postUpdate = (deps: TransparencyDeps): RequestHandler => async (_req, res) => {
  res.status(201).json(await service.postUpdate(deps, idOf(res), inputOf<UpdateInput>(res), currentUser(res)))
}

export const recordExpense = (deps: TransparencyDeps): RequestHandler => async (_req, res) => {
  res.status(201).json(await service.recordExpense(deps, idOf(res), inputOf<ExpenseInput>(res), currentUser(res)))
}

export const reviewExpense = (deps: TransparencyDeps): RequestHandler => async (_req, res) => {
  res.json(await service.reviewExpense(deps, idOf(res), inputOf<ExpenseReviewInput>(res), currentUser(res)))
}

export const uploadReceipt = (deps: TransparencyDeps): RequestHandler => async (req, res) => {
  const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
  res.status(201).json(await service.uploadReceipt(deps, idOf(res), { bytes, name: fileNameHeader(req.get('x-file-name')) }, currentUser(res)))
}

/** Tên file đi qua header nên được mã hoá URI ở phía trình duyệt; giải mã lỗi thì dùng tên mặc định. */
function fileNameHeader(value: string | undefined) {
  try {
    return decodeURIComponent(value ?? '')
  } catch {
    return ''
  }
}

export const readFile = (deps: TransparencyDeps): RequestHandler => async (_req, res) => {
  const file = await service.readReceipt(deps, idOf(res), maybeUser(res))
  res.set({
    'content-type': file.mime,
    'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
    // File người dùng tải lên được phục vụ cùng origin với API: chặn mọi script nếu ai đó mở thẳng link.
    'content-security-policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
  })
  res.end(Buffer.from(file.data))
}
