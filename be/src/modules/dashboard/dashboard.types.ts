import type { AppDeps } from '../../common/types/dependencies.ts'
import type * as users from '../users/users.repository.ts'
import type * as dashboard from './dashboard.repository.ts'
export type DashboardDeps = AppDeps & { users: typeof users; dashboard: typeof dashboard }
