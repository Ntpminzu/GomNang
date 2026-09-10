'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { fetchProject, readDemoModeFromUrl, withDemoMode, type DemoMode } from '@/lib/api.ts'
import { CONTRIBUTION_STATUS_LABEL, type ProjectDetail } from '@/lib/types.ts'
import { DemoSwitch, EmptyState, ErrorState, LoadingState, NeedProgress, ProgressLegend, StatusBadge } from '@/components/ui.tsx'

type Load =
  | { status: 'loading' }
  | { status: 'ok'; project: ProjectDetail | null }
  | { status: 'error'; message: string }

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [mode, setMode] = useState<DemoMode>('normal')
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const current = readDemoModeFromUrl()
    setMode(current)
    setLoad({ status: 'loading' })

    let cancelled = false
    fetchProject(id, current)
      .then((project) => {
        if (!cancelled) setLoad({ status: 'ok', project })
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoad({ status: 'error', message: err instanceof Error ? err.message : 'Lỗi không xác định.' })
      })

    return () => {
      cancelled = true
    }
  }, [id, attempt])

  return (
    <>
      <p style={{ marginBottom: '.75rem' }}>
        <Link href={withDemoMode('/', mode)}>← Về danh sách dự án</Link>
      </p>

      <DemoSwitch mode={mode} basePath={`/projects/${id}`} />

      {load.status === 'loading' && <LoadingState label="Đang tải thông tin dự án…" />}

      {load.status === 'error' && <ErrorState message={load.message} onRetry={() => setAttempt((n) => n + 1)} />}

      {load.status === 'ok' && !load.project && (
        <EmptyState title="Không tìm thấy dự án">
          <p>Dự án có thể đã bị gỡ, hoặc đường dẫn không đúng.</p>
        </EmptyState>
      )}

      {load.status === 'ok' && load.project && <ProjectView project={load.project} />}
    </>
  )
}

function ProjectView({ project }: { project: ProjectDetail }) {
  const totalMissing = project.needs.reduce((sum, n) => sum + Math.max(0, n.targetQty - n.committedQty), 0)

  return (
    <>
      <div className="page-head">
        <StatusBadge status={project.status} />
        <h1 style={{ marginTop: '.5rem' }}>{project.name}</h1>
        <p className="lead">{project.goal}</p>
      </div>

      <div className="card stack">
        <div className="row">
          <div>
            <h3>Nhóm thụ hưởng</h3>
            <p className="muted">{project.beneficiaryGroup}</p>
          </div>
          <div>
            <h3>Địa điểm</h3>
            <p className="muted">{project.location}</p>
          </div>
          <div>
            <h3>Thời gian</h3>
            <p className="muted">
              {project.startDate}
              {project.endDate !== project.startDate && ` → ${project.endDate}`}
            </p>
          </div>
          <div>
            <h3>Người phụ trách</h3>
            <p className="muted">
              Điều phối: {project.coordinatorName}
              <br />
              Tài chính: {project.treasurerName ?? 'không có hạng mục bằng tiền'}
            </p>
          </div>
        </div>
      </div>

      <h2>Nhu cầu {totalMissing > 0 ? `— còn thiếu ${totalMissing} đơn vị` : '— đã đủ cam kết'}</h2>
      <ProgressLegend />
      <div className="card">
        {project.needs.map((need) => (
          <NeedProgress key={need.id} need={need} />
        ))}
      </div>

      <h2>Đóng góp đã ghi nhận</h2>
      {project.contributions.length === 0 ? (
        <EmptyState title="Chưa có ai đóng góp">
          <p>Dự án vừa được tạo. Đóng góp đầu tiên thường tới sau khi dự án được xác minh.</p>
        </EmptyState>
      ) : (
        <div className="card table-wrap">
          <table>
            <caption className="sr-only">Danh sách đóng góp của dự án</caption>
            <thead>
              <tr>
                <th scope="col">Người đóng góp</th>
                <th scope="col">Hạng mục</th>
                <th scope="col">Số lượng</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {project.contributions.map((c) => (
                <tr key={c.id}>
                  <td>{c.contributorName}</td>
                  <td>{c.needLabel}</td>
                  <td>
                    {c.quantity} {c.unit}
                  </td>
                  <td>{CONTRIBUTION_STATUS_LABEL[c.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Sổ ghi vết</h2>
      <p className="muted" style={{ fontSize: '.86rem', marginTop: '-.35rem' }}>
        Mọi thay đổi trạng thái đều được ghi lại và không sửa được. Đây là cách hệ thống chứng minh tính minh bạch.
      </p>
      <div className="card table-wrap" style={{ marginTop: '.75rem' }}>
        <table>
          <caption className="sr-only">Lịch sử thay đổi của dự án</caption>
          <thead>
            <tr>
              <th scope="col">Thời điểm</th>
              <th scope="col">Người thực hiện</th>
              <th scope="col">Đối tượng</th>
              <th scope="col">Thay đổi</th>
            </tr>
          </thead>
          <tbody>
            {project.auditLog.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.at}</td>
                <td>{entry.actorName}</td>
                <td>{entry.entity}</td>
                <td>
                  {entry.fromState ? `${entry.fromState} → ${entry.toState}` : `tạo mới → ${entry.toState}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
