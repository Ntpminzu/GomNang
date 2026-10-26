import type { AppDeps } from '../../common/types/dependencies.ts'
import type * as projects from '../projects/projects.repository.ts'
import type * as contributions from '../contributions/contributions.repository.ts'
import type * as audit from '../../infrastructure/audit/audit.repository.ts'
import type { ContributionEvents } from './contributions.events.ts'
export type ContributionsDeps = AppDeps & { projects: typeof projects; contributions: typeof contributions; audit: typeof audit; events?: ContributionEvents }
