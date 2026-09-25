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
