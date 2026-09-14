'use client'

import { useState } from 'react'
import Link from 'next/link'
import { canReviewProject } from '@gomnang/shared/rules.ts'
import { VERDICT_LABEL, type Assessment, type Verdict } from '@gomnang/shared/types.ts'
import { formatTime } from '@/lib/format.ts'
import { useAction } from '@/lib/use-action.ts'
import { ErrorAlert, Field, a11yProps } from '@/components/ui.tsx'
import { projectRef, type PanelProps } from '@/features/projects/project-ref.ts'
import { reviewProject } from './verification.api.ts'

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <span className={`badge verdict-${verdict}`}>{VERDICT_LABEL[verdict]}</span>
}

/** Kết quả của người gác cổng. Chỉ là gợi ý cho người xác minh — nó không tự đổi trạng thái dự án. */
export function AssessmentPanel({ assessment }: { assessment: Assessment }) {
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
              <Link href={`/projects/${p.id}`}>{p.name}</Link> ({Math.round(p.similarity * 100)}%)
            </span>
          ))}
        </p>
      )}
    </section>
  )
}

/**
 * Khối duyệt hoặc trả lại dự án. Hỏi shared/rules.ts để quyết định có hiện nút không —
 * cùng quy tắc mà backend dùng để từ chối. Giấu nút chỉ để giao diện gọn; backend vẫn là nơi chặn thật.
 */
export function ReviewPanel({ project, user, onChanged }: PanelProps) {
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
              onClick={() => run(() => reviewProject(project.id, { decision: 'approve' }), onChanged)}
            >
              Duyệt và công khai
            </button>
            <button
              className="btn"
              disabled={busy}
              onClick={() => run(() => reviewProject(project.id, { decision: 'reject', reason }), onChanged)}
            >
              Trả lại cho người điều phối
            </button>
          </div>
        </>
      )}
    </section>
  )
}
