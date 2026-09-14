import type { Member } from '@gomnang/shared/types.ts'
import { request } from '../../lib/api-client.ts'

/** POST /api/auth/dev-login */
export const devLogin = (email: string) =>
  request<{ token: string; user: Member & { email: string } }>('POST', '/api/auth/dev-login', { email })
