'use client'
import { useEffect, useState } from 'react'
import type { ProjectDetail } from '@gomnang/domain/types.ts'
import { getProject } from '@/libs/api/index.ts'
import type { DemoMode } from '@/libs/api/demo.ts'
import { ApiError } from '@/libs/api/errors.ts'
import { isMockMode } from '@/libs/config/env.ts'
import { connectContributionEvents, waitForReconnect } from '@/libs/api/contribution-events.ts'
import { expireSession } from '@/libs/session/index.ts'
import { useSession } from '@/presentation/providers/SessionProvider.tsx'

export function useContributionUpdates(initial: ProjectDetail, mode: DemoMode) {
  const { revision } = useSession()
  const [project, setProject] = useState<ProjectDetail | null>(initial)
  const [status, setStatus] = useState('Đang kết nối cập nhật đóng góp…')
  useEffect(() => {
    setProject(initial)
    if (isMockMode) { setStatus('Dữ liệu mô phỏng — không có cập nhật trực tiếp.'); return }
    const lifetime = new AbortController()
    let disposed = false
    let terminal = false
    let connected = false
    let fetching = false
    let dirty = false
    let retry: ReturnType<typeof setTimeout> | undefined
    const stopForAccess = (error: unknown) => {
      if (!(error instanceof ApiError) || ![401, 403, 404].includes(error.status)) return false
      terminal = true
      lifetime.abort()
      clearTimeout(retry)
      setProject(null)
      setStatus(error.status === 401 ? 'Phiên đã hết hạn. Vui lòng đăng nhập lại.' : 'Không còn quyền xem bảng đóng góp.')
      if (error.status === 401) expireSession(revision)
      return true
    }
    const refresh = async () => {
      dirty = true
      if (fetching || lifetime.signal.aborted) return
      fetching = true
      clearTimeout(retry)
      try {
        while (dirty && !lifetime.signal.aborted) {
          dirty = false
          setStatus('Đang đồng bộ bảng đóng góp…')
          const next = await getProject(initial.id, mode, { signal: lifetime.signal })
          if (lifetime.signal.aborted) return
          setProject(next)
        }
        if (connected && !lifetime.signal.aborted) setStatus('Bảng đóng góp đã đồng bộ trực tiếp.')
      } catch (error) {
        if (disposed || terminal || lifetime.signal.aborted) return
        if (!stopForAccess(error)) {
          setStatus('Chưa đồng bộ được bảng đóng góp. Đang thử lại…')
          retry = setTimeout(() => { void refresh() }, 2_000)
        }
      } finally { fetching = false }
    }
    void (async () => {
      let backoff = 1_000
      while (!lifetime.signal.aborted) {
        connected = false
        setStatus('Đang kết nối cập nhật đóng góp…')
        let rotating = false
        try {
          const reason = await connectContributionEvents(initial.id, lifetime.signal, (event) => {
            if (lifetime.signal.aborted) return
            if (event === 'ready') { connected = true; backoff = 1_000; void refresh() }
            else if (event === 'contributions-changed') void refresh()
          })
          rotating = reason === 'reconnect'
        } catch (error) {
          if (lifetime.signal.aborted || stopForAccess(error)) break
        }
        connected = false
        if (lifetime.signal.aborted) break
        setStatus(rotating ? 'Đang làm mới kết nối cập nhật…' : 'Mất kết nối cập nhật. Đang kết nối lại…')
        await waitForReconnect(rotating ? 0 : backoff, lifetime.signal)
        backoff = Math.min(backoff * 2, 10_000)
      }
    })()
    return () => { disposed = true; lifetime.abort(); clearTimeout(retry) }
  }, [initial, mode, revision])
  return { project, status }
}
