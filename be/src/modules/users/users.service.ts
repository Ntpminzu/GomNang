import { toMember } from '@gomnang/domain/views.ts'
import type { UsersDeps } from './users.types.ts'
export async function listMembers(deps: UsersDeps) { return (await deps.users.listUsers(deps.db)).map(toMember) }
