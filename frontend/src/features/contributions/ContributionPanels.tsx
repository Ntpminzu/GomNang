'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HandHeart } from 'lucide-react'
import { allowedTransitions } from '@gomnang/shared/rules.ts'
import { ACCEPTING_STATUSES, CONTRIBUTION_STATUS_LABEL, type ContributionStatus } from '@gomnang/shared/types.ts'
import { useAction } from '@/lib/use-action.ts'
import { EmptyState, ErrorAlert, FormField, Panel, a11yProps, toneClass, type Tone } from '@/components/states.tsx'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { withNext } from '@/features/auth/auth-redirect.ts'
import { projectRef, type PanelProps } from '@/features/projects/project-ref.ts'
import { commitContribution, transitionContribution } from './contributions.api.ts'

const CONTRIBUTION_TONE: Record<ContributionStatus, Tone> = {
  proposed: 'neutral',
  committed: 'primary',
  delivered: 'warning',
  confirmed: 'success',
}

/** Khối cam kết đóng góp một phần cụ thể cho hạng mục còn thiếu (US-2). */
export function CommitPanel({ project, user, onChanged }: PanelProps) {
  const { busy, error, run } = useAction()
  const [needId, setNeedId] = useState('')
  const [quantity, setQuantity] = useState('')
  const pathname = usePathname()
  if (!ACCEPTING_STATUSES.includes(project.status)) return null

  const open = project.needs.filter((n) => n.targetQty > n.committedQty)

  if (!user) {
    return (
      <Panel title="Cam kết đóng góp">
        <p className="text-muted-foreground">Đăng nhập để cam kết đóng góp.</p>
        <Button asChild className="mt-3">
          <Link href={withNext('/login', pathname)}>Đăng nhập</Link>
        </Button>
      </Panel>
    )
  }
  if (open.length === 0) {
    return (
      <Panel title="Cam kết đóng góp">
        <p>Mọi hạng mục đã đủ cam kết.</p>
      </Panel>
    )
  }

  const selected = open.find((n) => n.id === needId) ?? open[0]

  return (
    <Panel title="Cam kết đóng góp" titleId="commit-title">
      <ErrorAlert error={error} />
      <form
        className="mt-3 grid items-end gap-4 sm:grid-cols-[2fr_1fr_auto]"
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
        <FormField id="commit-need" label="Hạng mục">
          <NativeSelect
            {...a11yProps('commit-need')}
            className="w-full"
            value={selected.id}
            onChange={(e) => setNeedId(e.target.value)}
          >
            {open.map((n) => (
              <NativeSelectOption key={n.id} value={n.id}>
                {n.label} — còn thiếu {n.targetQty - n.committedQty} {n.unit}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="commit-qty" label={`Số lượng (${selected.unit})`}>
          <Input
            {...a11yProps('commit-qty')}
            type="number"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </FormField>
        <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
          <HandHeart aria-hidden="true" />
          {busy ? 'Đang gửi…' : 'Cam kết'}
        </Button>
      </form>
    </Panel>
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
      <Card className="py-0">
        <Table className="[&_td]:px-3 [&_th]:px-3">
          <TableCaption className="sr-only">Danh sách đóng góp của dự án</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Người đóng góp</TableHead>
              <TableHead scope="col">Hạng mục</TableHead>
              <TableHead scope="col">Số lượng</TableHead>
              <TableHead scope="col">Trạng thái</TableHead>
              <TableHead scope="col">
                <span className="sr-only">Thao tác</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {project.contributions.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium whitespace-normal">{c.contributor.name}</TableCell>
                <TableCell className="whitespace-normal">{c.needLabel}</TableCell>
                <TableCell className="tabular-nums">
                  {c.quantity} {c.unit}
                </TableCell>
                <TableCell>
                  <Badge className={toneClass[CONTRIBUTION_TONE[c.status] ?? 'neutral']}>
                    {CONTRIBUTION_STATUS_LABEL[c.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {allowedTransitions({ status: c.status, contributorId: c.contributor.id }, ref, c.needKind, user).map(
                      (to) => (
                        <Button
                          key={to}
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => run(() => transitionContribution(c.id, to), onChanged)}
                        >
                          {to === 'delivered' ? 'Đã bàn giao' : 'Xác nhận'}
                        </Button>
                      ),
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
