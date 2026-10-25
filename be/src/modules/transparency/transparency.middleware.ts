import express, { type RequestHandler } from 'express'
import { RECEIPT_MAX_BYTES } from '@gomnang/domain/files.ts'
import { HttpError } from '../../common/errors/http-error.ts'
import { validateBody, validateId } from '../../common/middleware/validation.ts'
import { expenseBody, expenseReviewBody, updateBody } from './transparency.schema.ts'
export const projectId = validateId('PROJECT_NOT_FOUND', 'Không tìm thấy dự án.')
export const expenseId = validateId('EXPENSE_NOT_FOUND', 'Không tìm thấy khoản chi.')
export const fileId = validateId('FILE_NOT_FOUND', 'Không tìm thấy file, hoặc bạn không có quyền xem.')

const raw = express.raw({ type: () => true, limit: RECEIPT_MAX_BYTES })
/** Đọc nguyên nội dung file (không multipart). Quá giới hạn thì báo lỗi riêng cho file, không dùng thông báo 100 KB của JSON. */
export const receiptUpload: RequestHandler = (req, res, next) =>
  raw(req, res, (err?: { type?: string }) =>
    err?.type === 'entity.too.large'
      ? next(new HttpError(413, 'FILE_TOO_LARGE', 'File vượt quá 3 MB. Hãy chụp lại ảnh nhỏ hơn hoặc nén file PDF.'))
      : next(err),
  )
export const updateBodyInput = validateBody(updateBody)
export const expenseBodyInput = validateBody(expenseBody)
export const expenseReviewBodyInput = validateBody(expenseReviewBody)
