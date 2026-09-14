import type { Member } from '@gomnang/domain/types.ts'
import { request } from '../client.ts'
export type LoginResult = { token: string; user: Member & { email: string } }
export function loginByEmail(email: string) {
  return request<LoginResult>('/api/auth/dev-login', { method: 'POST', body: { email }, anonymous: true })
}
