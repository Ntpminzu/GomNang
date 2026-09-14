'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getProject, withDemoMode } from '@/libs/api/index.ts'
import { useLoad } from '@/presentation/hooks/use-load.ts'
import { AssessmentPanel, ReviewPanel } from '@/presentation/modules/verification/index.ts'
import { AuditTable, DraftPanel } from '../index.ts'
import { CommitPanel, ContributionsTable } from '@/presentation/modules/contributions/index.ts'
import { type PanelProps } from '@/presentation/types/project-panels.ts'
import { ApiErrorState, DemoSwitch, LoadingState } from '@/presentation/components/index.ts'
import { NeedProgress, ProgressLegend, StatusBadge } from '../index.ts'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { mode, user, state, reload } = useLoad((m) => getProject(id, m), [id])

  return (
    <>
      <p style={{ marginBottom: '.75rem' }}>
        <Link href={withDemoMode('/', mode)}>← Về danh sách dự án</Link>
      </p>

      <DemoSwitch mode={mode} basePath={`/projects/${id}`} />

      {state.status === 'loading' && <LoadingState label="Đang tải thông tin dự án…" />}
      {state.status === 'error' && <ApiErrorState error={state.error} onRetry={reload} />}
      {state.status === 'ok' && <ProjectView project={state.data} user={user} mode={mode} onChanged={reload} />}
    </>
  )
}

function ProjectView(props: PanelProps) {
  const { project, user, mode } = props
  const isInsider =
    !!user && (user.isVerifier || user.id === project.coordinator.id || user.id === project.treasurer?.id)
  const showAssessment =
    isInsider && project.latestAssessment && (project.status === 'draft' || project.status === 'pending_verification')
  const totalMissing = project.needs.reduce((sum, n) => sum + Math.max(0, n.targetQty - n.committedQty), 0)

  return (
    <>
      <div className="page-head">
        <StatusBadge status={project.status} />
        <h1 style={{ marginTop: '.5rem' }}>{project.name}</h1>
        <p className="lead">{project.goal}</p>
      </div>

      <DraftPanel {...props} />
      {showAssessment && <AssessmentPanel assessment={project.latestAssessment!} mode={mode} />}
      <ReviewPanel {...props} />

      <div className="card">
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
              Điều phối: {project.coordinator.name}
              <br />
              Tài chính: {project.treasurer?.name ?? 'không có hạng mục bằng tiền'}
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

      <CommitPanel {...props} />

      <h2>Đóng góp đã ghi nhận</h2>
      <ContributionsTable {...props} />

      <h2>Sổ ghi vết</h2>
      <p className="muted" style={{ fontSize: '.86rem', marginTop: '-.35rem' }}>
        Mọi thay đổi trạng thái đều được ghi lại và không sửa được. Đây là cách hệ thống chứng minh tính minh bạch.
      </p>
      <AuditTable entries={project.auditLog} />
    </>
  )
}
