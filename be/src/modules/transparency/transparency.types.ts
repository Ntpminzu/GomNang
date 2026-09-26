import type { AppDeps } from '../../common/types/dependencies.ts'
import type * as projects from '../projects/projects.repository.ts'
import type * as transparency from './transparency.repository.ts'
import type * as audit from '../../infrastructure/audit/audit.repository.ts'
export type TransparencyDeps = AppDeps & { projects: typeof projects; transparency: typeof transparency; audit: typeof audit }
