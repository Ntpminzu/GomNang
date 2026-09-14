'use client'

import { useState } from 'react'
import { allowedTransitions } from '@gomnang/shared/rules.ts'
import { ACCEPTING_STATUSES, CONTRIBUTION_STATUS_LABEL } from '@gomnang/shared/types.ts'
import { useAction } from '@/lib/use-action.ts'
import { EmptyState, ErrorAlert, Field, a11yProps } from '@/components/ui.tsx'
import { projectRef, type PanelProps } from '@/features/projects/project-ref.ts'
import { commitContribution, transitionContribution } from './contributions.api.ts'

/** Khối cam kết đóng góp một phần cụ thể cho hạng mục còn thiếu (US-2). */
export function CommitPanel({ project, user, onChanged }: PanelProps) {
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
            () => commitContribution(project.id, { needItemId: selected.id, quantity: amount }),
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

/**
 * Bảng đóng góp kèm nút "Đã bàn giao" / "Xác nhận". Nút nào hiện là do allowedTransitions trong shared/rules.ts
 * quyết định — cùng quy tắc backend dùng để từ chối, nên người đóng góp không bao giờ thấy nút tự xác nhận.
 */
export function ContributionsTable({ project, user, onChanged }: PanelProps) {
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
                      onClick={() => run(() => transitionContribution(c.id, to), onChanged)}
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
