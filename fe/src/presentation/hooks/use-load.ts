'use client'
import { useEffect, useRef, useState } from 'react'
import { readDemoModeFromUrl, type DemoMode } from '../../libs/api/demo.ts'
import { toApiError, type ApiError } from '../../libs/api/errors.ts'
import { useSession } from '../providers/SessionProvider.tsx'
export type Load<T> = { status: 'loading' } | { status: 'ok'; data: T } | { status: 'error'; error: ApiError }
export function useLoad<T>(fetcher: (mode: DemoMode) => Promise<T>, deps: readonly unknown[] = []) {
  const [mode, setMode] = useState<DemoMode>('normal')
  const [state, setState] = useState<Load<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const { user, revision, ready } = useSession()
  const loadedFor = useRef<readonly unknown[] | null>(null)
  useEffect(() => {
    if (!ready) return
    const current = readDemoModeFromUrl()
    setMode(current)
    // reload() sau một thao tác: giữ dữ liệu đang hiện để trang không nháy về trạng thái tải (mất tab, mất vị trí cuộn).
    const key = [current, revision, ...deps]
    const same = loadedFor.current?.length === key.length && key.every((v, i) => Object.is(v, loadedFor.current![i]))
    setState((s) => (same && s.status === 'ok' ? s : { status: 'loading' }))
    loadedFor.current = key
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
