import type { UserRow } from '@gomnang/domain/types.ts'
import type { AppDeps } from '../../common/types/dependencies.ts'
import type { authSessions } from '../../infrastructure/database/schema.ts'
import type * as repository from './auth.repository.ts'
import type { OAuthStateStore } from './auth.oauth-state.ts'
export type AuthDeps = AppDeps & { auth: typeof repository; oauthState: OAuthStateStore }
export type AuthUser = UserRow
export type AuthContext = { user: AuthUser; session: typeof authSessions.$inferSelect }
export type LoginInput = { email: string }
export type RegisterInput = { name: string; phone: string; email: string; password: string; confirmPassword: string }
export type LoginPasswordInput = { email: string; password: string }
export type ChangePasswordInput = { currentPassword: string; newPassword: string; confirmPassword: string }
