import { STATUS_LABEL, type NeedItem, type ProjectStatus } from '@gomnang/shared/types.ts'
import { Badge } from '@/components/ui/badge'
import { toneClass, type Tone } from '@/components/states.tsx'

const STATUS_TONE: Partial<Record<ProjectStatus, Tone>> = {
  draft: 'neutral',
  pending_verification: 'warning',
  published: 'primary',
  in_progress: 'success',
  completed: 'success',
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge className={toneClass[STATUS_TONE[status] ?? 'neutral']}>{STATUS_LABEL[status]}</Badge>
}

/**
 * Thanh tiến độ hai lớp: phần đã bàn giao nằm trong phần đã cam kết.
 * Cam kết mà chưa bàn giao thì chưa tính là xong — đúng theo chuỗi trạng thái
 * đóng góp trong đặc tả (đề xuất → cam kết → bàn giao → xác nhận).
 */
export function NeedProgress({ need }: { need: NeedItem }) {
  const pct = (n: number) => Math.min(100, Math.round((n / need.targetQty) * 100))
  const delivered = pct(need.deliveredQty)
  const committedOnly = Math.max(0, pct(need.committedQty) - delivered)
  const missing = Math.max(0, need.targetQty - need.committedQty)

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 font-medium">{need.label}</span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {need.deliveredQty}/{need.targetQty} {need.unit}
        </span>
      </div>
      <div
        className="flex h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={need.deliveredQty}
        aria-valuemin={0}
        aria-valuemax={need.targetQty}
        aria-label={`${need.label}: đã bàn giao ${need.deliveredQty} trên ${need.targetQty} ${need.unit}`}
      >
        <div className="h-full bg-success" style={{ width: `${delivered}%` }} />
        <div className="h-full bg-primary/45" style={{ width: `${committedOnly}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {missing > 0 ? (
          <>
            còn thiếu <strong className="font-semibold text-foreground">{missing}</strong> {need.unit}
          </>
        ) : (
          <>đã đủ cam kết</>
        )}
        {' · '}đã cam kết {need.committedQty}
        {' · '}đã xác nhận {need.confirmedQty}
      </p>
    </div>
  )
}

export function ProgressLegend() {
  return (
    <p className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 rounded-full bg-success" />
        đã bàn giao
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 rounded-full bg-primary/45" />
        đã cam kết, chưa bàn giao
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 rounded-full border bg-muted" />
        còn thiếu
      </span>
    </p>
  )
}
