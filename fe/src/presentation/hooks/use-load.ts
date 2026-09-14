'use client'
import { useEffect, useState } from 'react'
import { readDemoModeFromUrl, type DemoMode } from '../../libs/api/demo.ts'
import { toApiError, type ApiError } from '../../libs/api/errors.ts'
import { useSession } from '../providers/SessionProvider.tsx'
export type Load<T> = { status: 'loading' } | { status: 'ok'; data: T } | { status: 'error'; error: ApiError }
export function useLoad<T>(fetcher: (mode: DemoMode) => Promise<T>, deps: readonly unknown[] = []) {
  const [mode, setMode] = useState<DemoMode>('normal')
  const [state, setState] = useState<Load<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const { user, revision, ready } = useSession()
  useEffect(() => {
    if (!ready) return
    const current = readDemoModeFromUrl()
    setMode(current)
    setState({ status: 'loading' })
    let cancelled = false
    fetcher(current).then(
      (data) => { if (!cancelled) setState({ status: 'ok', data }) },
      (err: unknown) => { if (!cancelled) setState({ status: 'error', error: toApiError(err) }) },
    )
    return () => { cancelled = true }
    // Callers supply data dependencies explicitly; inline fetcher changes every render.
  }, [attempt, revision, ready, ...deps])
  return { mode, user, state, reload: () => setAttempt((n) => n + 1) }
}
