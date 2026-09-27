import { Banknote, GraduationCap, HandHelping, Package, Truck, type LucideIcon } from 'lucide-react'
import { NEED_KIND_LABEL, STATUS_LABEL, type NeedItem, type NeedKind, type ProjectStatus } from '@gomnang/domain/types.ts'
import { Badge } from '@/presentation/components/ui/badge.tsx'
import { toneClass, type Tone } from '@/presentation/components/index.ts'
import { cn } from '@/libs/utils/cn.ts'

const STATUS_TONE: Record<ProjectStatus, Tone> = {
  draft: 'neutral',
  pending_verification: 'warning',
  published: 'sun',
  in_progress: 'primary',
  completed: 'success',
  cancelled: 'danger',
}

export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return <Badge className={cn(toneClass[STATUS_TONE[status]], className)}>{STATUS_LABEL[status]}</Badge>
}

export const NEED_KIND_ICON: Record<NeedKind, LucideIcon> = {
  money: Banknote,
  goods: Package,
  labor: HandHelping,
  skill: GraduationCap,
  venue: Truck,
}

export function NeedKindBadge({ kind }: { kind: NeedKind }) {
  const Icon = NEED_KIND_ICON[kind]
  return (
    <Badge variant="outline" className="gap-1 font-normal text-muted-foreground">
      <Icon aria-hidden="true" />
      {NEED_KIND_LABEL[kind]}
    </Badge>
  )
}

/** Thanh hai lớp: phần đã bàn giao (xanh) nằm trong phần đã cam kết (cam nhạt). Cam kết chưa bàn giao thì chưa tính là xong. */
export function NeedBar({ need, label }: { need: NeedItem; label?: string }) {
  const pct = (n: number) => Math.min(100, Math.round((n / need.targetQty) * 100))
  const delivered = pct(need.deliveredQty)
  const committedOnly = Math.max(0, pct(need.committedQty) - delivered)
  return (
    <div
      className="flex h-2 overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={need.deliveredQty}
      aria-valuemin={0}
      aria-valuemax={need.targetQty}
      aria-label={label ?? `${need.label}: đã bàn giao ${need.deliveredQty} trên ${need.targetQty} ${need.unit}`}
    >
      <div className="bg-success transition-[width] duration-500" style={{ width: `${delivered}%` }} />
      <div className="bg-cta/45 transition-[width] duration-500" style={{ width: `${committedOnly}%` }} />
    </div>
  )
}

export function NeedProgress({ need }: { need: NeedItem }) {
  const missing = Math.max(0, need.targetQty - need.committedQty)
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate font-medium">{need.label}</span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {need.deliveredQty}/{need.targetQty} {need.unit}
        </span>
      </div>
      <NeedBar need={need} />
      <p className="text-xs text-muted-foreground tabular-nums">
        {missing > 0 ? (
          <>
            còn thiếu <strong className="text-foreground">{missing}</strong> {need.unit}
          </>
        ) : (
          'đã đủ cam kết'
        )}
        {' · '}đã cam kết {need.committedQty}
        {' · '}đã xác nhận {need.confirmedQty}
      </p>
    </div>
  )
}

export function ProgressLegend({ className }: { className?: string }) {
  const item = (swatch: string, text: string) => (
    <span className="inline-flex items-center gap-1.5">
      <i aria-hidden="true" className={cn('size-2.5 rounded-full', swatch)} />
      {text}
    </span>
  )
  return (
    <p className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground', className)}>
      {item('bg-success', 'đã bàn giao')}
      {item('bg-cta/45', 'đã cam kết, chưa bàn giao')}
      {item('border bg-muted', 'còn thiếu')}
    </p>
  )
}
