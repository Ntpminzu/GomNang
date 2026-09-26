'use client'

import Link from 'next/link'
import { CheckCircle2, HandHeart } from 'lucide-react'
import { ACCEPTING_STATUSES, NEED_KIND_LABEL } from '@gomnang/domain/types.ts'
import { Button } from '@/presentation/components/ui/button.tsx'
import { CommitDialog } from '@/presentation/modules/contributions/components/CommitDialog.tsx'
import type { PanelProps } from '@/presentation/types/project-panels.ts'
import { NEED_KIND_ICON, NeedBar, ProgressLegend } from './status.tsx'

/**
 * Nhu cầu dạng "danh sách chọn món" (kiểu wishlist từ thiện): mỗi hạng mục một thẻ, nhận ngay trên thẻ
 * thay vì chọn hạng mục trong một form chung. Người đóng góp thấy rõ món nào còn thiếu bao nhiêu.
 */
export function NeedsList({ project, user, mode, onChanged }: PanelProps) {
  const accepting = ACCEPTING_STATUSES.includes(project.status)

  return (
    <div className="space-y-4">
      <ProgressLegend />
      <ul className="grid gap-3 sm:grid-cols-2">
        {project.needs.map((need) => {
          const Icon = NEED_KIND_ICON[need.kind]
          const remaining = Math.max(0, need.targetQty - need.committedQty)
          return (
            <li key={need.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{need.label}</p>
                  <p className="text-xs text-muted-foreground">{NEED_KIND_LABEL[need.kind]}</p>
                </div>
                <p className="shrink-0 text-right text-sm tabular-nums">
                  <span className="font-semibold">{need.committedQty}</span>
                  <span className="text-muted-foreground">
                    /{need.targetQty} {need.unit}
                  </span>
                </p>
              </div>
              <NeedBar need={need} />
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground tabular-nums">
                  {remaining > 0 ? (
                    <>
                      Còn thiếu <strong className="text-foreground">{remaining}</strong> {need.unit} · đã xác nhận {need.confirmedQty}
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-success">
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      Đã đủ cam kết
                    </span>
                  )}
                </span>
                {accepting && remaining > 0 && (
                  user ? (
                    <CommitDialog projectId={project.id} need={need} mode={mode} onDone={onChanged}>
                      <Button variant="cta" size="lg">
                        <HandHeart aria-hidden="true" />
                        Nhận phần này
                      </Button>
                    </CommitDialog>
                  ) : (
                    <Button asChild variant="outline" size="lg">
                      <Link href={`/login?next=${encodeURIComponent(`/projects/${project.id}`)}`}>Đăng nhập để nhận</Link>
                    </Button>
                  )
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
