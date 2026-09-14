'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { canEditProject } from '@gomnang/shared/rules.ts'
import { stateLabel, type AuditEntry } from '@gomnang/shared/types.ts'
import { formatTime } from '@/lib/format.ts'
import { useAction } from '@/lib/use-action.ts'
import { useLoad } from '@/lib/use-load.ts'
import { ApiErrorState, ErrorAlert, LoadingState } from '@/components/ui.tsx'
import { CommitPanel, ContributionsTable } from '@/features/contributions/ContributionPanels.tsx'
import { AssessmentPanel, ReviewPanel } from '@/features/verification/VerificationPanels.tsx'
import { submitProject } from '@/features/verification/verification.api.ts'
import { NeedProgress, ProgressLegend, StatusBadge } from './ProjectDisplay.tsx'
import { projectRef, type PanelProps } from './project-ref.ts'
import { getProject } from './projects.api.ts'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, state, reload } = useLoad(() => getProject(id), [id])

  return (
    <>
      <p style={{ marginBottom: '.75rem' }}>
        <Link href="/">← Về danh sách dự án</Link>
      </p>

      {state.status === 'loading' && <LoadingState label="Đang tải thông tin dự án…" />}
      {state.status === 'error' && <ApiErrorState error={state.error} onRetry={reload} />}
      {state.status === 'ok' && <ProjectView project={state.data} user={user} onChanged={reload} />}
    </>
  )
}

function ProjectView(props: PanelProps) {
  const { project, user } = props
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
      {showAssessment && <AssessmentPanel assessment={project.latestAssessment!} />}
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

/** Khối cho người điều phối khi dự án còn là bản nháp: sửa, hoặc gửi đi xác minh. */
function DraftPanel({ project, user, onChanged }: PanelProps) {
  const { busy, error, run } = useAction()
  if (!user || !canEditProject(projectRef(project), user).ok) return null

  return (
    <section className="panel" aria-labelledby="draft-panel-title">
      <h2 id="draft-panel-title">Bản nháp — chưa công khai</h2>
      {project.rejectionReason && (
        <div className="alert alert-error">
          <strong>Người xác minh đã trả lại dự án:</strong>
          <p style={{ margin: '.35rem 0 0' }}>{project.rejectionReason}</p>
        </div>
      )}
      <p className="muted">
        Sửa cho đủ thông tin rồi gửi đi xác minh. Dự án chỉ hiện công khai sau khi người xác minh duyệt.
      </p>
      <ErrorAlert error={error} />
      <div className="actions">
        <Link className="btn" href={`/projects/${project.id}/edit`}>
          Sửa dự án
        </Link>
        <button className="btn btn-primary" disabled={busy} onClick={() => run(() => submitProject(project.id), onChanged)}>
          {busy ? 'Đang gửi…' : 'Gửi xác minh'}
        </button>
      </div>
    </section>
  )
}

function AuditTable({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="card table-wrap">
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
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{formatTime(entry.at)}</td>
              <td>{entry.actor.name}</td>
              <td>{entry.entityType === 'project' ? 'Dự án' : 'Đóng góp'}</td>
              <td>
                {entry.fromState ? stateLabel(entry.entityType, entry.fromState) : 'tạo mới'} →{' '}
                {stateLabel(entry.entityType, entry.toState)}
                {entry.reason && <div className="muted">Lý do: {entry.reason}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
