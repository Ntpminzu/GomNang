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
