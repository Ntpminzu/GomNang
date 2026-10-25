import type { AuthDeps } from '../auth/auth.types.ts'
import type * as repository from './admin.repository.ts'
export type AdminDeps = Pick<AuthDeps, 'db' | 'auth'> & { admin: typeof repository }
export type CreateVerifierInput = { name: string; email: string; password: string; confirmPassword: string; phone?: string }
