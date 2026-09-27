'use client'

import { ArrowDownLeft, ArrowUpRight, Check, ExternalLink, Scale, X } from 'lucide-react'
import { toast } from 'sonner'
import { ACCEPTING_STATUSES, EXPENSE_STATUS_LABEL, type Expense, type ExpenseStatus } from '@gomnang/domain/types.ts'
import { ledgerLines } from '@gomnang/domain/views.ts'
import { reviewExpense } from '@/libs/api/index.ts'
import { cn } from '@/libs/utils/cn.ts'
import { formatTime } from '@/libs/utils/date.ts'
import { EmptyState, ErrorAlert, TextDialog, linkClass, toneClass, type Tone } from '@/presentation/components/index.ts'
import { Badge } from '@/presentation/components/ui/badge.tsx'
import { Button } from '@/presentation/components/ui/button.tsx'
import { useAction } from '@/presentation/hooks/use-action.ts'
import type { PanelProps } from '@/presentation/types/project-panels.ts'
import { ExpenseDialog } from './ExpenseDialog.tsx'

const TONE: Record<ExpenseStatus, Tone> = { pending: 'warning', approved: 'success', rejected: 'danger' }
const fmt = (n: number) => n.toLocaleString('vi-VN')

type Entry =
  | { kind: 'in'; id: string; at: string; amount: number; unit: string; label: string; who: string }
  | { kind: 'out'; id: string; at: string; expense: Expense }

/**
 * Sổ thu chi công khai (kiểu Open Collective): mỗi hạng mục tiền là một quỹ.
 * Thu = tiền đã được xác nhận nhận; chi = khoản người phụ trách tài chính ghi và người điều phối đã duyệt.
 */
export function Ledger({ project, user, mode, onChanged }: PanelProps) {
  const { busy, error, run } = useAction()
  const lines = ledgerLines(project.needs, project.expenses)
  if (lines.length === 0) {
    return (
      <EmptyState title="Dự án không nhận tiền">
        <p>Dự án chỉ nhận hiện vật và công sức nên không có sổ thu chi.</p>
      </EmptyState>
    )
  }

  const isTreasurer = !!user && user.id === project.treasurer?.id
  const isCoordinator = !!user && user.id === project.coordinator.id
  const confirmedAt = (id: string) =>
    project.auditLog.filter((e) => e.entityType === 'contribution' && e.entityId === id && e.toState === 'confirmed').at(-1)?.at
  const entries: Entry[] = [
    ...project.contributions
      .filter((c) => c.needKind === 'money' && c.status === 'confirmed')
      .map((c): Entry => ({
        kind: 'in',
        id: c.id,
        at: confirmedAt(c.id) ?? c.createdAt,
        amount: c.quantity,
        unit: c.unit,
        label: c.needLabel,
        who: c.contributor.name,
      })),
    ...project.expenses.map((e): Entry => ({ kind: 'out', id: e.id, at: e.createdAt, expense: e })),
  ].sort((a, b) => b.at.localeCompare(a.at))

  const approve = (e: Expense) =>
    run(
      () => reviewExpense(e.id, { decision: 'approve' }, mode),
      () => {
        toast.success(`Đã duyệt khoản chi ${fmt(e.amount)} ${e.unit}.`)
        return onChanged()
      },
    )

  return (
    <div className="space-y-4">
      <p className="flex gap-2 text-sm text-muted-foreground">
        <Scale className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        Chỉ tính tiền đã được xác nhận nhận. Mỗi khoản chi do người phụ trách tài chính ghi và phải được người điều phối duyệt — hai người
        khác nhau.
      </p>

      <ul className="grid gap-3 sm:grid-cols-2" aria-label="Các quỹ của dự án">
        {lines.map((l) => {
          const spentPct = l.received ? Math.min(100, Math.round((l.spent / l.received) * 100)) : 0
          return (
            <li key={l.needItemId} className="rounded-xl border bg-card p-4">
              <p className="text-sm font-medium">{l.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {fmt(l.balance)} <span className="text-sm font-normal text-muted-foreground">{l.unit} còn lại</span>
              </p>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-success/20"
                role="progressbar"
                aria-valuenow={l.spent}
                aria-valuemin={0}
                aria-valuemax={l.received}
                aria-label={`${l.label}: đã chi ${l.spent} trên ${l.received} ${l.unit} đã nhận`}
              >
                <div className="h-full bg-primary" style={{ width: `${spentPct}%` }} />
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Đã nhận</dt>
                  <dd className="font-semibold tabular-nums">{fmt(l.received)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Đã chi</dt>
                  <dd className="font-semibold tabular-nums">{fmt(l.spent)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Chờ duyệt</dt>
                  <dd className={cn('font-semibold tabular-nums', l.pending > 0 && 'text-warning')}>{fmt(l.pending)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-muted-foreground">
                Mục tiêu {fmt(l.budget)} {l.unit}
              </p>
            </li>
          )
        })}
      </ul>

      {isTreasurer && ACCEPTING_STATUSES.includes(project.status) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-4">
          <p className="text-sm text-muted-foreground">Bạn phụ trách tài chính. Ghi mỗi khoản chi ngay khi chi, kèm link ảnh hoá đơn.</p>
          <ExpenseDialog projectId={project.id} lines={lines} mode={mode} onDone={onChanged} />
        </div>
      )}

      <ErrorAlert error={error} />
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có khoản thu chi nào được xác nhận.</p>
      ) : (
        <ul aria-label="Sổ thu chi" className="divide-y rounded-xl border bg-card">
          {entries.map((entry) =>
            entry.kind === 'in' ? (
              <li key={entry.id} className="flex items-start gap-3 p-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-success/12 text-success" aria-hidden="true">
                  <ArrowDownLeft className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Nhận từ {entry.who}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.label} · {formatTime(entry.at)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-success tabular-nums">
                  +{fmt(entry.amount)} <span className="font-normal">{entry.unit}</span>
                </p>
              </li>
            ) : (
              <ExpenseRow
                key={entry.id}
                expense={entry.expense}
                canReview={isCoordinator && entry.expense.status === 'pending'}
                busy={busy}
                onApprove={() => approve(entry.expense)}
                onReject={(reason) => reviewExpense(entry.expense.id, { decision: 'reject', reason }, mode)}
                onChanged={onChanged}
              />
            ),
          )}
        </ul>
      )}
    </div>
  )
}

function ExpenseRow({
  expense: e,
  canReview,
  busy,
  onApprove,
  onReject,
  onChanged,
}: {
  expense: Expense
  canReview: boolean
  busy: boolean
  onApprove: () => void
  onReject: (reason: string) => Promise<unknown>
  onChanged: () => void
}) {
  const rejected = e.status === 'rejected'
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/12 text-primary" aria-hidden="true">
          <ArrowUpRight className="size-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className={cn('text-sm font-medium', rejected && 'text-muted-foreground')}>{e.description}</p>
          <p className="text-xs text-muted-foreground">
            {e.needLabel} · ghi bởi {e.recordedBy.name} · {formatTime(e.createdAt)}
            {e.reviewedBy && ` · ${e.status === 'approved' ? 'duyệt' : 'từ chối'} bởi ${e.reviewedBy.name}`}
          </p>
          {e.receiptUrl && (
            <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" className={cn(linkClass, 'inline-flex items-center gap-1 text-xs')}>
              Xem hoá đơn
              <ExternalLink className="size-3" aria-hidden="true" />
              <span className="sr-only">(mở tab mới)</span>
            </a>
          )}
          {e.reviewReason && <p className="text-xs text-destructive">Lý do từ chối: {e.reviewReason}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-11 sm:flex-col sm:items-end sm:pl-0">
        <p className={cn('text-sm font-semibold tabular-nums', rejected && 'text-muted-foreground line-through')}>
          −{fmt(e.amount)} <span className="font-normal">{e.unit}</span>
        </p>
        <Badge className={toneClass[TONE[e.status]]}>{EXPENSE_STATUS_LABEL[e.status]}</Badge>
        {canReview && (
          <div className="flex gap-2">
            <Button size="lg" disabled={busy} onClick={onApprove}>
              <Check aria-hidden="true" />
              Duyệt
            </Button>
            <TextDialog
              id={`reject-${e.id}`}
              title="Từ chối khoản chi này?"
              description={<p>Khoản chi không trừ vào số dư. Người phụ trách tài chính sẽ thấy lý do để bổ sung hoặc ghi lại.</p>}
              label="Lý do từ chối"
              placeholder="Ví dụ: Thiếu ảnh hoá đơn, số tiền không khớp biên nhận."
              minLength={5}
              maxLength={1000}
              submitLabel="Từ chối"
              variant="destructive"
              success="Đã từ chối khoản chi."
              onSubmit={onReject}
              onDone={onChanged}
            >
              <Button size="lg" variant="ghost" disabled={busy}>
                <X aria-hidden="true" />
                Từ chối
              </Button>
            </TextDialog>
          </div>
        )}
      </div>
    </li>
  )
}
