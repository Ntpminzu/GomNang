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
