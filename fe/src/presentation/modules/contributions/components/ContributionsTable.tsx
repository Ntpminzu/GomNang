'use client'

import Link from 'next/link'
import { Ban, PackageCheck, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { allowedTransitions } from '@gomnang/domain/rules.ts'
import { CONTRIBUTION_STATUS_LABEL, type Contribution, type ContributionStatus } from '@gomnang/domain/types.ts'
import { transitionContribution } from '@/libs/api/index.ts'
import { cn } from '@/libs/utils/cn.ts'
import { formatTime } from '@/libs/utils/date.ts'
import { projectRef } from '@/libs/utils/project.ts'
import { EmptyState, ErrorAlert, TextDialog, toneClass, type Tone } from '@/presentation/components/index.ts'
import { Badge } from '@/presentation/components/ui/badge.tsx'
import { Button } from '@/presentation/components/ui/button.tsx'
import { useAction } from '@/presentation/hooks/use-action.ts'
import type { PanelProps } from '@/presentation/types/project-panels.ts'
import { useContributionUpdates } from '../use-contribution-updates.ts'

const TONE: Record<ContributionStatus, Tone> = {
  proposed: 'neutral',
  committed: 'primary',
  delivered: 'warning',
  confirmed: 'success',
  cancelled: 'neutral',
}

export function ContributionStatusBadge({ status }: { status: ContributionStatus }) {
  return <Badge className={toneClass[TONE[status]]}>{CONTRIBUTION_STATUS_LABEL[status]}</Badge>
}

/** Nút nào hiện là do allowedTransitions trong packages/domain quyết định — cùng quy tắc backend dùng để chặn. */
export function ContributionsTable(props: PanelProps) {
  const { project, status } = useContributionUpdates(props.project, props.mode)
  return (
    <div className="space-y-3">
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{status}</p>
      {project && <ContributionRows {...props} project={project} />}
    </div>
  )
}

function ContributionRows({ project, user, mode, onChanged }: PanelProps) {
  const { busy, error, run } = useAction()

  if (project.contributions.length === 0) {
    return (
      <EmptyState title="Chưa có ai đóng góp">
        <p>Đóng góp đầu tiên thường tới sau khi dự án được xác minh và công khai.</p>
      </EmptyState>
    )
  }

  const ref = projectRef(project)
  // Ghi chú mới nhất của từng đóng góp (bàn giao cho ai, vì sao huỷ) — sổ ghi vết xếp theo thời gian nên cái sau đè cái trước.
  const notes = new Map(
    project.auditLog.filter((e) => e.entityType === 'contribution' && e.reason).map((e) => [e.entityId, e.reason!]),
  )

  const confirm = (c: Contribution) =>
    run(
      () => transitionContribution(c.id, { to: 'confirmed' }, mode),
      () => {
        toast.success(`Đã xác nhận ${c.needLabel} (${c.quantity} ${c.unit}) của ${c.contributor.name}.`)
        return onChanged()
      },
    )

  return (
    <>
      <ErrorAlert error={error} />
      <ul aria-label="Danh sách đóng góp của dự án" className="divide-y rounded-xl border bg-card">
        {project.contributions.map((c) => (
          <li
            key={c.id}
            className={cn('flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4', c.status === 'cancelled' && 'text-muted-foreground')}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                <Link href={`/u/${c.contributor.id}`} className="underline-offset-4 hover:text-primary hover:underline">
                  {c.contributor.name}
                </Link>
                <span className="font-normal text-muted-foreground"> · {c.needLabel}</span>
              </p>
              <p className="text-xs text-muted-foreground">{formatTime(c.createdAt)}</p>
              {notes.has(c.id) && <p className="mt-1 text-xs text-muted-foreground italic">“{notes.get(c.id)}”</p>}
            </div>
            <div className="flex items-center gap-3 sm:w-48 sm:justify-end">
              <span className={cn('font-semibold tabular-nums', c.status === 'cancelled' && 'line-through')}>
                {c.quantity} {c.unit}
              </span>
              <ContributionStatusBadge status={c.status} />
            </div>
            <div className="flex flex-wrap gap-2 empty:hidden sm:justify-end">
              {allowedTransitions({ status: c.status, contributorId: c.contributor.id }, ref, c.needKind, user).map((to) =>
                to === 'confirmed' ? (
                  <Button key={to} size="lg" disabled={busy} onClick={() => confirm(c)}>
                    <ShieldCheck aria-hidden="true" />
                    Xác nhận đã nhận
                  </Button>
                ) : to === 'delivered' ? (
                  <TextDialog
                    key={to}
                    id={`deliver-note-${c.id}`}
                    title={`Báo đã bàn giao: ${c.needLabel} (${c.quantity} ${c.unit})`}
                    description={<p>Người điều phối sẽ kiểm và xác nhận. Ghi chú giúp họ đối chiếu nhanh hơn.</p>}
                    label="Ghi chú bàn giao"
                    placeholder="Ví dụ: Đã giao tận tay chị Lan ở mái ấm lúc 9h sáng 20/9."
                    maxLength={500}
                    submitLabel="Đã bàn giao"
                    success="Đã báo bàn giao. Người điều phối sẽ xác nhận sớm."
                    onSubmit={(note) => transitionContribution(c.id, { to, note: note || undefined }, mode)}
                    onDone={onChanged}
                  >
                    <Button size="lg" variant="outline" disabled={busy}>
                      <PackageCheck aria-hidden="true" />
                      Đã bàn giao
                    </Button>
                  </TextDialog>
                ) : (
                  <TextDialog
                    key={to}
                    id={`cancel-note-${c.id}`}
                    title="Huỷ cam kết này?"
                    description={<p>Phần {c.quantity} {c.unit} sẽ trở lại danh sách còn thiếu để người khác nhận. Không hoàn tác được.</p>}
                    label="Lý do"
                    placeholder="Ví dụ: Nhà có việc đột xuất, không kịp chuẩn bị."
                    maxLength={500}
                    submitLabel="Huỷ cam kết"
                    variant="destructive"
                    success="Đã huỷ cam kết."
                    onSubmit={(note) => transitionContribution(c.id, { to, note: note || undefined }, mode)}
                    onDone={onChanged}
                  >
                    <Button size="lg" variant="ghost" disabled={busy} aria-label={`Huỷ cam kết ${c.needLabel} (${c.quantity} ${c.unit})`}>
                      <Ban aria-hidden="true" />
                      Huỷ
                    </Button>
                  </TextDialog>
                ),
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
