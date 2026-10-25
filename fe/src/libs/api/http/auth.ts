import type { LoginResult, SessionUser } from '@gomnang/domain/types.ts'
import { request, createHttpClient } from '../client.ts'
import { ApiError } from '../errors.ts'
import { beginAuthentication, getSessionSnapshot, saveSession, saveSessionIfCurrent } from '../../session/index.ts'
export type { LoginResult }
export const loginByEmail = (email: string) => request<LoginResult>('/api/auth/dev-login', { method: 'POST', body: { email }, anonymous: true })
export type RegisterBody = { name: string; phone: string; email: string; password: string; confirmPassword: string }
export const register = (body: RegisterBody) => request<LoginResult>('/api/auth/register', { method: 'POST', body, anonymous: true })
export const loginWithPassword = (email: string, password: string) => request<LoginResult>('/api/auth/login', { method: 'POST', body: { email, password }, anonymous: true })
// Public capabilities do not depend on the identity being bootstrapped in parallel.
const capabilityRequest = createHttpClient({ session: { read: () => ({ token: null, revision: 0 }), expire() {} } })
export const authOptions = () => capabilityRequest<{ googleEnabled: boolean; devLoginEnabled: boolean }>('/api/auth/options', { anonymous: true })
export async function refreshSession() {
  const revision = getSessionSnapshot().revision
  const result = await request<{ user: SessionUser }>('/api/auth/me')
  saveSessionIfCurrent(revision, result.user, getSessionSnapshot().token!)
}
export async function logout() {
  const revision = getSessionSnapshot().revision
  try {
    await request<void>('/api/auth/logout', { method: 'POST' })
    if (getSessionSnapshot().revision === revision) saveSession(null)
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return // The HTTP client already cleared this invalid session.
    throw err
  }
}
export async function changePassword(body: { currentPassword: string; newPassword: string; confirmPassword: string }) {
  const revision = getSessionSnapshot().revision
  const result = await request<LoginResult>('/api/auth/change-password', { method: 'POST', body })
  saveSessionIfCurrent(revision, result.user, result.token)
  return result
}
type GoogleCompletion = ({ status: 'authenticated'; next: string } & LoginResult) | { status: 'link_required' }
function rememberGoogleCompletion(result: LoginResult & { next: string }) {
  try { globalThis.sessionStorage?.setItem('gomnang.oauthReturn.v1', JSON.stringify({ userId: result.user.id, next: result.next })) } catch {}
  if (typeof window !== 'undefined') window.history.replaceState(window.history.state, '', '/auth/callback?status=completed')
}
let completion: { revision: number; committed?: number; promise: Promise<GoogleCompletion> } | null = null
/** StrictMode shares one consume request and commits its session exactly once. */
export function completeGoogleOnce() {
  const current = getSessionSnapshot().revision
  if (completion && (completion.revision === current || completion.committed === current)) return completion.promise
  const revision = beginAuthentication()
  const entry: NonNullable<typeof completion> = { revision, promise: Promise.resolve({ status: 'link_required' }) }
  completion = entry
  entry.promise = request<GoogleCompletion>('/api/auth/google/complete', { method: 'POST', anonymous: true }).then((result) => {
    if (result.status === 'authenticated') {
      saveSessionIfCurrent(revision, result.user, result.token)
      entry.committed = getSessionSnapshot().revision
      rememberGoogleCompletion(result)
    }
    return result
  })
  return entry.promise
}
export async function confirmGoogleLink(password: string) {
  const revision = getSessionSnapshot().revision
  const result = await request<LoginResult & { next: string }>('/api/auth/google/link-confirm', { method: 'POST', anonymous: true, body: { password, confirm: true } })
  saveSessionIfCurrent(revision, result.user, result.token)
  rememberGoogleCompletion(result)
  return result
}
