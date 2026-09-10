'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchProjects, readDemoModeFromUrl, withDemoMode, type DemoMode } from '@/lib/api.ts'
import type { ProjectSummary } from '@/lib/types.ts'
import { DemoSwitch, EmptyState, ErrorState, LoadingState, NeedProgress, ProgressLegend, StatusBadge } from '@/components/ui.tsx'

type Load =
  | { status: 'loading' }
  | { status: 'ok'; projects: ProjectSummary[] }
  | { status: 'error'; message: string }

export default function ProjectListPage() {
  const [mode, setMode] = useState<DemoMode>('normal')
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const current = readDemoModeFromUrl()
    setMode(current)
    setLoad({ status: 'loading' })

    let cancelled = false
    fetchProjects(current)
      .then((projects) => {
        if (!cancelled) setLoad({ status: 'ok', projects })
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoad({ status: 'error', message: err instanceof Error ? err.message : 'Lỗi không xác định.' })
      })

    return () => {
      cancelled = true
    }
  }, [attempt])

  const needle = query.trim().toLowerCase()
  const visible =
    load.status === 'ok'
      ? load.projects.filter((p) =>
          [p.name, p.location, p.beneficiaryGroup].some((field) => field.toLowerCase().includes(needle)),
        )
      : []

  return (
    <>
      <div className="page-head">
        <h1>Dự án đang kêu gọi</h1>
        <p className="lead">Chọn một dự án để xem còn thiếu gì và cam kết phần bạn lo được.</p>
      </div>

      <DemoSwitch mode={mode} basePath="/" />

      <div className="toolbar">
        <label htmlFor="search" className="sr-only">
          Tìm theo tên dự án, địa điểm hoặc nhóm thụ hưởng
        </label>
        <input
          id="search"
          type="search"
          placeholder="Tìm theo tên, địa điểm, nhóm thụ hưởng…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={load.status !== 'ok'}
        />
        <Link className="btn btn-primary" href={withDemoMode('/projects/new', mode)}>
          Tạo dự án
        </Link>
      </div>

      {load.status === 'loading' && <LoadingState label="Đang tải danh sách dự án…" />}

      {load.status === 'error' && <ErrorState message={load.message} onRetry={() => setAttempt((n) => n + 1)} />}

      {load.status === 'ok' && load.projects.length === 0 && (
        <EmptyState title="Chưa có dự án nào">
          <p>Khu vực của bạn chưa có hoạt động nào đang kêu gọi. Bạn có thể là người khởi xướng đầu tiên.</p>
          <p style={{ marginTop: '1rem' }}>
            <Link className="btn btn-primary" href={withDemoMode('/projects/new', mode)}>
              Tạo dự án đầu tiên
            </Link>
          </p>
        </EmptyState>
      )}

      {load.status === 'ok' && load.projects.length > 0 && visible.length === 0 && (
        <EmptyState title={`Không có dự án nào khớp với “${query.trim()}”`}>
          <p>Thử từ khoá ngắn hơn, hoặc tìm theo tên phường.</p>
          <p style={{ marginTop: '1rem' }}>
            <button className="btn" onClick={() => setQuery('')}>
              Xoá bộ lọc
            </button>
          </p>
        </EmptyState>
      )}

      {load.status === 'ok' && visible.length > 0 && (
        <>
          <p className="sr-only" role="status">{`Tìm thấy ${visible.length} dự án.`}</p>
          <ProgressLegend />
          <div className="grid">
            {visible.map((p) => (
              <Link key={p.id} href={withDemoMode(`/projects/${p.id}`, mode)} className="card card-link">
                <StatusBadge status={p.status} />
                <h2 className="card-title">{p.name}</h2>
                <p className="card-meta">
                  {p.beneficiaryGroup} · {p.location}
                </p>
                {p.needs.slice(0, 2).map((need) => (
                  <NeedProgress key={need.id} need={need} />
                ))}
                {p.needs.length > 2 && <p className="muted" style={{ fontSize: '.82rem' }}>và {p.needs.length - 2} hạng mục khác</p>}
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  )
}
