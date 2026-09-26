import { validateBody, validateId } from '../../common/middleware/validation.ts'
import { expenseBody, expenseReviewBody, updateBody } from './transparency.schema.ts'
export const projectId = validateId('PROJECT_NOT_FOUND', 'Không tìm thấy dự án.')
export const expenseId = validateId('EXPENSE_NOT_FOUND', 'Không tìm thấy khoản chi.')
export const updateBodyInput = validateBody(updateBody)
export const expenseBodyInput = validateBody(expenseBody)
export const expenseReviewBodyInput = validateBody(expenseReviewBody)
