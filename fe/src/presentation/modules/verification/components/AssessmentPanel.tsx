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
