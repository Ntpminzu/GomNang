import type { SessionUser } from '@gomnang/domain/types.ts'
import { ROLES } from '@gomnang/domain/types.ts'
import { isMockMode } from '../config/env.ts'
import { DEMO_ACCOUNTS, getSessionUser as getMockUser, setSessionUser as setMockUser } from '../api/mock/session.ts'
import { ApiError } from '../api/errors.ts'
export { DEMO_ACCOUNTS }
export type { SessionUser }
export type SessionSnapshot = { user: SessionUser | null; token: string | null; ready: boolean; revision: number; error: ApiError | null; notice: string | null }
export const serverSnapshot: SessionSnapshot = { user: null, token: null, ready: false, revision: 0, error: null, notice: null }
const KEY = 'gomnang.httpSession.v1'
let snapshot = serverSnapshot
let bootstrap: Promise<void> | null = null
const listeners = new Set<() => void>()
export const getSessionSnapshot = () => snapshot
export const getSessionUser = () => snapshot.user
export const subscribeSession = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
function publish(next: Omit<SessionSnapshot, 'revision'>) {
  snapshot = { ...next, revision: snapshot.revision + 1 }
  for (const listener of listeners) listener()
}
export function isSessionUser(user: unknown): user is SessionUser {
  const u = user as SessionUser | null
  return !!u && typeof u.id === 'string' && typeof u.name === 'string' && typeof u.email === 'string' && ROLES.includes(u.role) && typeof u.identityVerified === 'boolean'
}
export function initializeSession(): Promise<void> {
  if (snapshot.ready) return Promise.resolve()
  if (bootstrap) return bootstrap
  const revision = snapshot.revision
  bootstrap = (async () => {
    if (isMockMode) { if (snapshot.revision === revision) publish({ user: getMockUser(), token: null, ready: true, error: null, notice: null }); return }
    let token: string | null = null
    try {
      const raw = globalThis.sessionStorage?.getItem(KEY)
      const saved = raw ? JSON.parse(raw) : null
      if (typeof saved?.token === 'string' && saved.token) token = saved.token
    } catch { /* Invalid/blocked storage starts as guest. */ }
    if (!token) { if (snapshot.revision === revision) publish({ user: null, token: null, ready: true, error: null, notice: null }); return }
    try {
      const response = await fetch('/api/auth/me', { headers: { authorization: 'Bearer ' + token }, cache: 'no-store', signal: AbortSignal.timeout(10_000) })
      if (snapshot.revision !== revision) return
      if (response.status === 401) { saveSession(null); publish({ ...snapshot, notice: 'Phiên đã hết hạn. Vui lòng đăng nhập lại.' }); return }
      if (!response.ok) throw new ApiError(response.status, 'SESSION_CHECK_FAILED', 'Chưa kiểm tra được phiên. Thử lại khi dịch vụ sẵn sàng.')
      const data = await response.json() as { user?: unknown }
      if (snapshot.revision !== revision) return
      if (!isSessionUser(data.user)) throw new ApiError(502, 'INVALID_RESPONSE', 'Dữ liệu phiên không hợp lệ.')
      saveSession(data.user, token)
    } catch (err) {
      if (snapshot.revision !== revision) return
      publish({ user: null, token: null, ready: false, error: err instanceof ApiError ? err : new ApiError(503, 'SESSION_CHECK_FAILED', 'Không kiểm tra được phiên. Kiểm tra mạng rồi thử lại.'), notice: null })
    }
  })().finally(() => { bootstrap = null })
  return bootstrap
}
export function saveSession(user: SessionUser | null, token: string | null = null) {
  if (isMockMode) setMockUser(user?.id ?? null)
  else {
    try {
      if (user && token) globalThis.sessionStorage?.setItem(KEY, JSON.stringify({ user, token }))
      else globalThis.sessionStorage?.removeItem(KEY)
    } catch { /* The in-memory session remains usable until reload. */ }
  }
  publish({ user, token, ready: true, error: null, notice: null })
}
/** Invalidates older bootstrap/auth responses before a new identity is authenticated. */
export function beginAuthentication() {
  publish({ ...snapshot, ready: true, error: null, notice: null })
  return snapshot.revision
}
export function saveSessionIfCurrent(revision: number, user: SessionUser, token: string) {
  if (snapshot.revision !== revision) throw new ApiError(409, 'SESSION_CHANGED', 'Phiên đã thay đổi. Đăng nhập lại bằng tài khoản hiện tại.')
  if (!isSessionUser(user)) throw new ApiError(502, 'INVALID_RESPONSE', 'Dữ liệu tài khoản không hợp lệ.')
  saveSession(user, token)
}
export function selectMockUser(id: string | null) { setMockUser(id); saveSession(getMockUser()) }
export function expireSession(revision: number) {
  if (snapshot.revision === revision) {
    saveSession(null)
    publish({ ...snapshot, notice: 'Phiên đã hết hạn hoặc đã bị thu hồi. Vui lòng đăng nhập lại.' })
  }
}
