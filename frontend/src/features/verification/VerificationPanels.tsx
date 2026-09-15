'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Undo2 } from 'lucide-react'
import { canReviewProject } from '@gomnang/shared/rules.ts'
import { VERDICT_LABEL, type Assessment, type Verdict } from '@gomnang/shared/types.ts'
import { formatTime } from '@/lib/format.ts'
import { useAction } from '@/lib/use-action.ts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ErrorAlert, FormField, Panel, a11yProps, linkClass, toneClass } from '@/components/states.tsx'
import { projectRef, type PanelProps } from '@/features/projects/project-ref.ts'
import { reviewProject } from './verification.api.ts'

const verdictTone = { PASS: toneClass.success, NEEDS_INFO: toneClass.warning, FLAG: toneClass.danger } as const

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <Badge className={verdictTone[verdict]}>{VERDICT_LABEL[verdict]}</Badge>
}

/** Kết quả của người gác cổng. Chỉ là gợi ý cho người xác minh — nó không tự đổi trạng thái dự án. */
export function AssessmentPanel({ assessment }: { assessment: Assessment }) {
  return (
    <Panel title="Người gác cổng" titleId="assessment-title" aside={<VerdictBadge verdict={assessment.verdict} />}>
      <p className="text-sm text-muted-foreground">
        {assessment.source === 'rules' ? 'Kiểm tra theo quy tắc, chưa dùng AI' : 'Đánh giá bằng mô hình AI'} ·{' '}
        {formatTime(assessment.createdAt)}. Đây chỉ là gợi ý — người xác minh mới là người quyết định.
      </p>
      {assessment.signals.length === 0 ? (
        <p className="mt-3">Không phát hiện điểm nào cần bổ sung.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {assessment.signals.map((signal) => (
            <li key={signal.code} className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <span>{signal.message}</span>
            </li>
          ))}
        </ul>
      )}
      {assessment.similarProjects.length > 0 && (
        <p className="mt-3 text-sm">
          Dự án tương tự:{' '}
          {assessment.similarProjects.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ', '}
              <Link href={`/projects/${p.id}`} className={linkClass}>
                {p.name}
              </Link>{' '}
              ({Math.round(p.similarity * 100)}%)
            </span>
          ))}
        </p>
      )}
    </Panel>
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
    <Panel title="Quyết định xác minh" titleId="review-title">
      {!check.ok ? (
        <p className="text-sm text-muted-foreground">{check.message}</p>
      ) : (
        <>
          <ErrorAlert error={error} />
          <FormField
            id="review-reason"
            label="Lý do trả lại"
            hint="Bắt buộc khi trả lại dự án. Người điều phối sẽ đọc được."
            className="mt-3"
          >
            <Textarea
              {...a11yProps('review-reason', undefined, true)}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </FormField>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="lg"
              disabled={busy}
              onClick={() => run(() => reviewProject(project.id, { decision: 'approve' }), onChanged)}
            >
              <CheckCircle2 aria-hidden="true" />
              Duyệt và công khai
            </Button>
            <Button
              size="lg"
              variant="outline"
              disabled={busy}
              onClick={() => run(() => reviewProject(project.id, { decision: 'reject', reason }), onChanged)}
            >
              <Undo2 aria-hidden="true" />
              Trả lại cho người điều phối
            </Button>
          </div>
        </>
      )}
    </Panel>
  )
}
