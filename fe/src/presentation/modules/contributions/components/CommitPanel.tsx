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
