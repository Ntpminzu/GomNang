'use client'

import { allowedTransitions } from '@gomnang/domain/rules.ts'
import { CONTRIBUTION_STATUS_LABEL, type ContributionStatus } from '@gomnang/domain/types.ts'
import { transitionContribution } from '@/libs/api/index.ts'
import { formatTime } from '@/libs/utils/date.ts'
import { projectRef } from '@/libs/utils/project.ts'
import { EmptyState, ErrorAlert, toneClass, type Tone } from '@/presentation/components/index.ts'
import { Badge } from '@/presentation/components/ui/badge.tsx'
import { Button } from '@/presentation/components/ui/button.tsx'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/presentation/components/ui/table.tsx'
import { useAction } from '@/presentation/hooks/use-action.ts'
import type { PanelProps } from '@/presentation/types/project-panels.ts'

const TONE: Record<ContributionStatus, Tone> = { proposed: 'neutral', committed: 'primary', delivered: 'warning', confirmed: 'success' }

export function ContributionStatusBadge({ status }: { status: ContributionStatus }) {
  return <Badge className={toneClass[TONE[status]]}>{CONTRIBUTION_STATUS_LABEL[status]}</Badge>
}

/** Nút nào hiện là do allowedTransitions trong packages/domain quyết định — cùng quy tắc backend dùng để chặn. */
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
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableCaption className="sr-only">Danh sách đóng góp của dự án</TableCaption>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead scope="col">Người đóng góp</TableHead>
              <TableHead scope="col">Hạng mục</TableHead>
              <TableHead scope="col" className="text-right">
                Số lượng
              </TableHead>
              <TableHead scope="col">Trạng thái</TableHead>
              <TableHead scope="col">
                <span className="sr-only">Thao tác</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {project.contributions.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="font-medium">{c.contributor.name}</div>
                  <div className="text-xs text-muted-foreground">{formatTime(c.createdAt)}</div>
                </TableCell>
                <TableCell className="whitespace-normal">{c.needLabel}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.quantity} {c.unit}
                </TableCell>
                <TableCell>
                  <ContributionStatusBadge status={c.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {allowedTransitions({ status: c.status, contributorId: c.contributor.id }, ref, c.needKind, user).map((to) => (
                      <Button
                        key={to}
                        size="sm"
                        variant={to === 'confirmed' ? 'default' : 'outline'}
                        disabled={busy}
                        onClick={() => run(() => transitionContribution(c.id, to, mode), onChanged)}
                      >
                        {to === 'delivered' ? 'Đã bàn giao' : 'Xác nhận đã nhận'}
                      </Button>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
