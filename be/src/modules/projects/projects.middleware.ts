import { validateBody, validateId, validateQuery } from '../../common/middleware/validation.ts'
import { cancelBody, completeBody, listQuery, projectBody } from './projects.schema.ts'
export const projectId = validateId('PROJECT_NOT_FOUND', 'Không tìm thấy dự án.')
export const listQueryInput = validateQuery(listQuery)
export const projectBodyInput = validateBody(projectBody)
export const completeBodyInput = validateBody(completeBody)
export const cancelBodyInput = validateBody(cancelBody)
