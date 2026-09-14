import { assessProject } from '@gomnang/domain/assess.ts'
import { canCommit, canEditProject, canReviewProject, canSubmitProject, canTransitionContribution, canViewProject } from '@gomnang/domain/rules.ts'
import { PUBLIC_PROJECT_STATUSES, type ProjectInput, type UserRow, type ReviewInput, type CommitInput, type TransitionTarget } from '@gomnang/domain/types.ts'
import { validateProject } from '@gomnang/domain/validate-project.ts'
import type { Exec } from '../../infrastructure/database/client.ts'
import { HttpError, ensure } from '../../common/errors/http-error.ts'
import { log } from '../../infrastructure/logging/logger.ts'
import type { ProjectsDeps } from './projects.types.ts'
export async function checkProjectRules(exec: Exec, today: string, input: ProjectInput, coordinatorId: string, findUser: ProjectsDeps['users']['findUser']) {
  const treasurer = input.treasurerId ? await findUser(exec, input.treasurerId) : null
  const errors = validateProject(input, {
    today,
    coordinatorId,
    treasurerVerified: input.treasurerId ? treasurer?.verified === true : undefined,
  })
  if (Object.keys(errors).length > 0) {
    throw new HttpError(422, 'VALIDATION_FAILED', 'Dữ liệu dự án chưa hợp lệ.', errors)
  }
}
