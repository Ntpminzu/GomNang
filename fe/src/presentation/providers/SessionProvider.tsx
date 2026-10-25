'use client'
import { createContext, Fragment, useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getSessionSnapshot, initializeSession, serverSnapshot, subscribeSession, type SessionSnapshot } from '../../libs/session/index.ts'
import { Button } from '../components/ui/button.tsx'
const SessionContext = createContext<SessionSnapshot>(serverSnapshot)
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState(serverSnapshot)
  useEffect(() => {
    const unsubscribe = subscribeSession(() => setSession(getSessionSnapshot()))
    void initializeSession()
    setSession(getSessionSnapshot())
    return unsubscribe
  }, [])
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}
export const useSession = () => useContext(SessionContext)
export function SessionBoundary({ children }: { children: React.ReactNode }) {
  const { revision, ready, error } = useSession()
  const pathname = usePathname()
  const authPage = ['/login', '/register', '/auth/callback', '/change-password'].includes(pathname)
  if (!authPage) {
    if (error) return <div role="alert" className="space-y-3"><p>{error.message}</p><Button onClick={() => void initializeSession()}>Kiểm tra phiên lại</Button><Button asChild variant="outline"><Link href="/login">Đăng nhập</Link></Button></div>
    if (!ready) return <p role="status">Đang kiểm tra phiên làm việc…</p>
  }
  return authPage ? children : <Fragment key={revision}>{children}</Fragment>
}
