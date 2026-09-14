'use client'

import { useState } from 'react'
import Link from 'next/link'
import { listProjects, withDemoMode } from '@/lib/api.ts'
import { useLoad } from '@/lib/use-load.ts'
import {
  ApiErrorState,
  DemoSwitch,
  EmptyState,
  LoadingState,
  NeedProgress,
  ProgressLegend,
  StatusBadge,
} from '@/components/ui.tsx'

export default function ProjectListPage() {
  const { mode, state, reload } = useLoad(listProjects)
  const [query, setQuery] = useState('')

  const needle = query.trim().toLowerCase()
  const projects = state.status === 'ok' ? state.data : []
  const visible = projects.filter((p) =>
    [p.name, p.location, p.beneficiaryGroup].some((field) => field.toLowerCase().includes(needle)),
  )

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
          disabled={state.status !== 'ok'}
        />
        <Link className="btn btn-primary" href={withDemoMode('/projects/new', mode)}>
          Tạo dự án
        </Link>
      </div>

      {state.status === 'loading' && <LoadingState label="Đang tải danh sách dự án…" />}

      {state.status === 'error' && <ApiErrorState error={state.error} onRetry={reload} />}

      {state.status === 'ok' && projects.length === 0 && (
        <EmptyState title="Chưa có dự án nào">
          <p>Khu vực của bạn chưa có hoạt động nào đang kêu gọi. Bạn có thể là người khởi xướng đầu tiên.</p>
          <p style={{ marginTop: '1rem' }}>
            <Link className="btn btn-primary" href={withDemoMode('/projects/new', mode)}>
              Tạo dự án đầu tiên
            </Link>
          </p>
        </EmptyState>
      )}

      {state.status === 'ok' && projects.length > 0 && visible.length === 0 && (
        <EmptyState title={`Không có dự án nào khớp với “${query.trim()}”`}>
          <p>Thử từ khoá ngắn hơn, hoặc tìm theo tên phường.</p>
          <p style={{ marginTop: '1rem' }}>
            <button className="btn" onClick={() => setQuery('')}>
              Xoá bộ lọc
            </button>
          </p>
        </EmptyState>
      )}

      {state.status === 'ok' && visible.length > 0 && (
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
                {p.needs.length > 2 && (
                  <p className="muted" style={{ fontSize: '.82rem' }}>
                    và {p.needs.length - 2} hạng mục khác
                  </p>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  )
}
