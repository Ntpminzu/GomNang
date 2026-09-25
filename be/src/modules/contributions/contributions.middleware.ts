import { validateBody, validateId } from '../../common/middleware/validation.ts'
import { commitBody, transitionBody } from './contributions.schema.ts'
export const projectId = validateId('PROJECT_NOT_FOUND', 'Không tìm thấy dự án.')
export const contributionId = validateId('CONTRIBUTION_NOT_FOUND', 'Không tìm thấy đóng góp.')
export const commitBodyInput = validateBody(commitBody)
export const transitionBodyInput = validateBody(transitionBody)
