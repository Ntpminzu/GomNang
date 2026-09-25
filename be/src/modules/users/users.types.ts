import type { AppDeps } from '../../common/types/dependencies.ts'
import type * as users from './users.repository.ts'
export type UsersDeps = AppDeps & { users: typeof users }
