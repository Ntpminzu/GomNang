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
} from '@/libs/api/index.ts'
import type { SessionUser } from '@/libs/session/index.ts'

import { EmptyState, ErrorAlert, Field, a11yProps } from '../../../components/index.ts'
import { VerdictBadge } from '../../verification/components/status.tsx'
import { formatTime } from '../../../../libs/utils/date.ts'
import { projectRef } from '../../../../libs/utils/project.ts'
import type { PanelProps } from '../../../types/project-panels.ts'
import { useAction } from '../../../hooks/use-action.ts'
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
