'use client'
import { createContext, Fragment, useContext, useEffect, useSyncExternalStore } from 'react'
import { getSessionSnapshot, initializeSession, serverSnapshot, subscribeSession, type SessionSnapshot } from '../../libs/session/index.ts'
const SessionContext = createContext<SessionSnapshot>(serverSnapshot)
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot, () => serverSnapshot)
  useEffect(() => { initializeSession() }, [])
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}
export const useSession = () => useContext(SessionContext)
/** Changing identity immediately unmounts private views and their in-flight state. */
export function SessionBoundary({ children }: { children: React.ReactNode }) {
  const { revision, ready } = useSession()
  if (!ready) return <p role="status">Đang tải phiên làm việc…</p>
  return <Fragment key={revision}>{children}</Fragment>
}
