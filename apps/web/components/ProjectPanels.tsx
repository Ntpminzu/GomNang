'use client'

import { useState } from 'react'
import Link from 'next/link'
import { allowedTransitions, canEditProject, canReviewProject } from '@gomnang/domain/rules.ts'
import {
  ACCEPTING_STATUSES,
  CONTRIBUTION_STATUS_LABEL,
  stateLabel,
  type Assessment,
  type AuditEntry,
  type ProjectDetail,
} from '@gomnang/domain/types.ts'
import {
  commitContribution,
  reviewProject,
  submitProject,
  toApiError,
  transitionContribution,
  withDemoMode,
  type ApiError,
  type DemoMode,
} from '@/lib/api.ts'
import type { SessionUser } from '@/lib/session.ts'
import { EmptyState, ErrorAlert, Field, VerdictBadge, a11yProps, formatTime } from './ui.tsx'

/**
 * Các khối thao tác trên trang chi tiết dự án.
 * Mỗi khối tự hỏi packages/domain xem người đang dùng có được thấy nút hay không — cùng quy tắc
 * mà máy chủ dùng để từ chối. Giấu nút chỉ là để giao diện gọn; máy chủ vẫn là nơi chặn thật.
 */

export type PanelProps = {
  project: ProjectDetail
  user: SessionUser | null
  mode: DemoMode
  onChanged: () => void
}

export const projectRef = (p: ProjectDetail) => ({
  status: p.status,
  coordinatorId: p.coordinator.id,
  treasurerId: p.treasurer?.id ?? null,
})

/** Chạy một thao tác ghi: khoá nút trong lúc gửi, giữ lỗi để hiện ra, xong thì tải lại trang. */
function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  async function run(action: () => Promise<unknown>, onDone: () => void) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onDone()
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, run }
}

export function DraftPanel({ project, user, mode, onChanged }: PanelProps) {
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
        <Link className="btn" href={withDemoMode(`/projects/${project.id}/edit`, mode)}>
          Sửa dự án
        </Link>
        <button className="btn btn-primary" disabled={busy} onClick={() => run(() => submitProject(project.id, mode), onChanged)}>
          {busy ? 'Đang gửi…' : 'Gửi xác minh'}
        </button>
      </div>
    </section>
  )
}

export function AssessmentPanel({ assessment, mode }: { assessment: Assessment; mode: DemoMode }) {
  return (
    <section className="panel" aria-labelledby="assessment-title">
      <h2 id="assessment-title">
        Người gác cổng <VerdictBadge verdict={assessment.verdict} />
      </h2>
      <p className="muted" style={{ fontSize: '.85rem' }}>
        {assessment.source === 'rules' ? 'Kiểm tra theo quy tắc, chưa dùng AI' : 'Đánh giá bằng mô hình AI'} ·{' '}
        {formatTime(assessment.createdAt)}. Đây chỉ là gợi ý — người xác minh mới là người quyết định.
      </p>
      {assessment.signals.length === 0 ? (
        <p>Không phát hiện điểm nào cần bổ sung.</p>
      ) : (
        <ul className="signal-list">
          {assessment.signals.map((signal) => (
            <li key={signal.code}>{signal.message}</li>
          ))}
        </ul>
      )}
      {assessment.similarProjects.length > 0 && (
        <p style={{ marginTop: '.75rem' }}>
          Dự án tương tự:{' '}
          {assessment.similarProjects.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ', '}
              <Link href={withDemoMode(`/projects/${p.id}`, mode)}>{p.name}</Link> ({Math.round(p.similarity * 100)}%)
            </span>
          ))}
        </p>
      )}
    </section>
  )
}

export function ReviewPanel({ project, user, mode, onChanged }: PanelProps) {
  const { busy, error, run } = useAction()
  const [reason, setReason] = useState('')
  if (!user?.isVerifier || project.status !== 'pending_verification') return null

  const check = canReviewProject(projectRef(project), user, { decision: 'approve' })

  return (
    <section className="panel" aria-labelledby="review-title">
      <h2 id="review-title">Quyết định xác minh</h2>
      {!check.ok ? (
        <p className="muted">{check.message}</p>
      ) : (
        <>
          <ErrorAlert error={error} />
          <Field id="review-reason" label="Lý do trả lại" hint="Bắt buộc khi trả lại dự án. Người điều phối sẽ đọc được.">
            <textarea
              {...a11yProps('review-reason', undefined, true)}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <div className="actions">
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => run(() => reviewProject(project.id, { decision: 'approve' }, mode), onChanged)}
            >
              Duyệt và công khai
            </button>
            <button
              className="btn"
              disabled={busy}
              onClick={() => run(() => reviewProject(project.id, { decision: 'reject', reason }, mode), onChanged)}
            >
              Trả lại cho người điều phối
            </button>
          </div>
        </>
      )}
    </section>
  )
}

export function CommitPanel({ project, user, mode, onChanged }: PanelProps) {
  const { busy, error, run } = useAction()
  const [needId, setNeedId] = useState('')
  const [quantity, setQuantity] = useState('')
  if (!ACCEPTING_STATUSES.includes(project.status)) return null

  const open = project.needs.filter((n) => n.targetQty > n.committedQty)

  if (!user) {
    return (
      <section className="panel">
        <h2>Cam kết đóng góp</h2>
        <p className="muted">Chọn một tài khoản ở góc trên bên phải để cam kết đóng góp.</p>
      </section>
    )
  }
  if (open.length === 0) {
    return (
      <section className="panel">
        <h2>Cam kết đóng góp</h2>
        <p>Mọi hạng mục đã đủ cam kết.</p>
      </section>
    )
  }

  const selected = open.find((n) => n.id === needId) ?? open[0]

  return (
    <section className="panel" aria-labelledby="commit-title">
      <h2 id="commit-title">Cam kết đóng góp</h2>
      <ErrorAlert error={error} />
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault()
          const amount = quantity.trim() === '' ? Number.NaN : Number(quantity)
          run(
            () => commitContribution(project.id, { needItemId: selected.id, quantity: amount }, mode),
            () => {
              setQuantity('')
              onChanged()
            },
          )
        }}
      >
        <Field id="commit-need" label="Hạng mục">
          <select {...a11yProps('commit-need')} value={selected.id} onChange={(e) => setNeedId(e.target.value)}>
            {open.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label} — còn thiếu {n.targetQty - n.committedQty} {n.unit}
              </option>
            ))}
          </select>
        </Field>
        <Field id="commit-qty" label={`Số lượng (${selected.unit})`}>
          <input
            {...a11yProps('commit-qty')}
            type="number"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Field>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Đang gửi…' : 'Cam kết'}
        </button>
      </form>
    </section>
  )
}

export function ContributionsTable({ project, user, mode, onChanged }: PanelProps) {
  const { busy, error, run } = useAction()

  if (project.contributions.length === 0) {
    return (
      <EmptyState title="Chưa có ai đóng góp">
        <p>Đóng góp đầu tiên thường tới sau khi dự án được xác minh và công khai.</p>
      </EmptyState>
    )
  }

  const ref = projectRef(project)

  return (
    <>
      <ErrorAlert error={error} />
      <div className="card table-wrap">
        <table>
          <caption className="sr-only">Danh sách đóng góp của dự án</caption>
          <thead>
            <tr>
              <th scope="col">Người đóng góp</th>
              <th scope="col">Hạng mục</th>
              <th scope="col">Số lượng</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {project.contributions.map((c) => (
              <tr key={c.id}>
                <td>{c.contributor.name}</td>
                <td>{c.needLabel}</td>
                <td>
                  {c.quantity} {c.unit}
                </td>
                <td>{CONTRIBUTION_STATUS_LABEL[c.status]}</td>
                <td>
                  {allowedTransitions({ status: c.status, contributorId: c.contributor.id }, ref, c.needKind, user).map((to) => (
                    <button
                      key={to}
                      className="btn btn-sm"
                      disabled={busy}
                      onClick={() => run(() => transitionContribution(c.id, to, mode), onChanged)}
                    >
                      {to === 'delivered' ? 'Đã bàn giao' : 'Xác nhận'}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function AuditTable({ entries }: { entries: AuditEntry[] }) {
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
