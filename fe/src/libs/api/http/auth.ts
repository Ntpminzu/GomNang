import type { Member } from '@gomnang/domain/types.ts'
import { request } from '../client.ts'
export type LoginResult = { token: string; user: Member & { email: string } }
export function loginByEmail(email: string) {
  return request<LoginResult>('/api/auth/dev-login', { method: 'POST', body: { email }, anonymous: true })
}

export type RegisterBody = { name: string; phone: string; email: string; password: string; confirmPassword: string }
export function register(body: RegisterBody) {
  return request<LoginResult>('/api/auth/register', { method: 'POST', body, anonymous: true })
}

export function loginWithPassword(email: string, password: string) {
  return request<LoginResult>('/api/auth/login', { method: 'POST', body: { email, password }, anonymous: true })
}
