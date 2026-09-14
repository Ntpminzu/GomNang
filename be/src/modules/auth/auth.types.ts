import type { UserRow } from '@gomnang/domain/types.ts'
import type { AppDeps } from '../../common/types/dependencies.ts'
import type * as users from '../users/users.repository.ts'
export type AuthDeps = AppDeps & { users: Pick<typeof users, 'findUser' | 'findUserByEmail'> }
export type AuthUser = UserRow
export type LoginInput = { email: string }
