'use client'

import { useState } from 'react'
import Link from 'next/link'
import { listProjects, withDemoMode } from '@/libs/api/index.ts'
import { useLoad } from '@/presentation/hooks/use-load.ts'
import { ApiErrorState, DemoSwitch, EmptyState, LoadingState } from '@/presentation/components/index.ts'
import { NeedProgress, ProgressLegend, StatusBadge } from '../index.ts'

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
            <section className="home-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">NỀN TẢNG THIỆN NGUYỆN CỘNG ĐỒNG</p>
          <h1 id="hero-title">Điều tốt đẹp bắt đầu<br />từ <em>một chút sẻ chia.</em></h1>
          <p>Một cuốn sách, một bữa cơm, một phần thời gian. Kết nối những đóng góp nhỏ để cùng tạo nên thay đổi thật.</p>
          <div className="actions">
            <a className="btn btn-primary" href="#projects">Khám phá dự án <span aria-hidden="true">↗</span></a>
            <Link className="hero-link" href={withDemoMode('/projects/new', mode)}>Khởi xướng điều tốt <span aria-hidden="true">→</span></Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="sun-disc" />
          <div className="hill hill-back" /><div className="hill hill-front" />
          <div className="art-note">Từ những điều nhỏ bé<span>Gom thành một ngày nắng.</span></div>
        </div>
      </section>

      <div className="trust-strip">
        <span><b>01</b> Nhu cầu rõ ràng</span>
        <span><b>02</b> Đóng góp theo khả năng</span>
        <span><b>03</b> Theo dõi từng bàn giao</span>
      </div>

      <div className="page-head section-head" id="projects">
        <div><p className="eyebrow">CÙNG NHAU GÓP NẮNG</p><h2>Dự án đang kêu gọi</h2>
        <p className="lead">Chọn một dự án và góp phần bạn có thể.</p></div>
        {state.status === 'ok' && <span className="result-count" role="status">{visible.length} dự án</span>}
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
          <div className="grid project-grid">
            {visible.map((p) => (
              <Link key={p.id} href={withDemoMode(`/projects/${p.id}`, mode)} className="card card-link">
                <div className="project-card-top"><StatusBadge status={p.status} /><span className="card-arrow" aria-hidden="true">↗</span></div>
                <h2 className="card-title">{p.name}</h2>
                <p className="card-meta">
                  {p.beneficiaryGroup} · {p.location}
                </p>
                <div className="project-needs">{p.needs.slice(0, 2).map((need) => (
                  <NeedProgress key={need.id} need={need} />
                                ))}</div>
                {p.needs.length > 2 && (
                  <p className="muted" style={{ fontSize: '.82rem' }}>
                    và {p.needs.length - 2} hạng mục khác
                  </p>
                )}
                              <div className="card-footer">Xem dự án & đóng góp <span aria-hidden="true">→</span></div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  )
}
