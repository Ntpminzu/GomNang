import { validateBody, validateId } from '../../common/middleware/validation.ts'
import { reviewBody } from './verification.schema.ts'
export const projectId = validateId('PROJECT_NOT_FOUND', 'Không tìm thấy dự án.')
export const reviewBodyInput = validateBody(reviewBody)
