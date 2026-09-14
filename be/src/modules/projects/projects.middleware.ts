import { validateBody, validateId } from '../../common/middleware/validation.ts'
import { projectBody } from './projects.schema.ts'
export const projectId = validateId('PROJECT_NOT_FOUND', 'Không tìm thấy dự án.')
export const projectBodyInput = validateBody(projectBody)
