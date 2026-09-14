import type { Member } from '@gomnang/domain/types.ts'
import { isMockMode } from '../config/env.ts'
import { DEMO_ACCOUNTS, getSessionUser as getMockUser, setSessionUser as setMockUser } from '../api/mock/session.ts'
export { DEMO_ACCOUNTS }
export type SessionUser = Pick<Member, 'id' | 'name' | 'isVerifier'>
export type SessionSnapshot = { user: SessionUser | null; token: string | null; ready: boolean; revision: number }
export const serverSnapshot: SessionSnapshot = { user: null, token: null, ready: false, revision: 0 }
const KEY = 'gomnang.httpSession.v1'
let snapshot = serverSnapshot
const listeners = new Set<() => void>()
export const getSessionSnapshot = () => snapshot
export const getSessionUser = () => snapshot.user
export const subscribeSession = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }

function publish(user: SessionUser | null, token: string | null) {
  snapshot = { user, token, ready: true, revision: snapshot.revision + 1 }
  for (const listener of listeners) listener()
}
export function initializeSession() {
  if (snapshot.ready) return
  if (isMockMode) { publish(getMockUser(), null); return }
  try {
    const raw = globalThis.sessionStorage?.getItem(KEY)
    const saved = raw ? JSON.parse(raw) : null
    if (typeof saved?.token === 'string' && typeof saved?.user?.id === 'string' && typeof saved?.user?.name === 'string' && typeof saved?.user?.isVerifier === 'boolean') {
      publish(saved.user, saved.token)
      return
    }
  } catch { /* Storage blocked or invalid: start as guest. */ }
  publish(null, null)
}
export function saveSession(user: SessionUser | null, token: string | null = null) {
  if (isMockMode) setMockUser(user?.id ?? null)
  else {
    try {
      if (user && token) globalThis.sessionStorage?.setItem(KEY, JSON.stringify({ user, token }))
      else globalThis.sessionStorage?.removeItem(KEY)
    } catch { /* In-memory session remains usable until reload. */ }
  }
  publish(user, token)
}
export function selectMockUser(id: string | null) { setMockUser(id); publish(getMockUser(), null) }
export function expireSession(revision: number) {
  if (snapshot.revision === revision) saveSession(null)
}
