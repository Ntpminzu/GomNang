import type { ProjectInput } from '@gomnang/domain/types.ts'
import { validateProject } from '@gomnang/domain/validate-project.ts'
import type { Exec } from '../../infrastructure/database/client.ts'
import { HttpError } from '../../common/errors/http-error.ts'
import type { ProjectsDeps } from './projects.types.ts'
export async function checkProjectRules(exec: Exec, today: string, input: ProjectInput, coordinatorId: string, findUser: ProjectsDeps['users']['findUser']) {
  const treasurer = input.treasurerId ? await findUser(exec, input.treasurerId) : null
  const errors = validateProject(input, {
    today,
    coordinatorId,
    treasurerIdentityVerified: input.treasurerId ? treasurer?.identityVerified === true : undefined,
  })
  if (Object.keys(errors).length > 0) {
    throw new HttpError(422, 'VALIDATION_FAILED', 'Dữ liệu dự án chưa hợp lệ.', errors)
  }
}
