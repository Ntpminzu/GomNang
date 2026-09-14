import type { AppDeps } from '../../common/types/dependencies.ts'
import type * as projects from '../projects/projects.repository.ts'
import type * as users from '../users/users.repository.ts'
import type * as verification from '../verification/verification.repository.ts'
import type * as audit from '../../infrastructure/audit/audit.repository.ts'
export type VerificationDeps = AppDeps & { projects: typeof projects; users: typeof users; verification: typeof verification; audit: typeof audit }
