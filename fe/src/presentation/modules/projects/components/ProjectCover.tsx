import type { NeedKind } from '@gomnang/domain/types.ts'
import { cn } from '@/libs/utils/cn.ts'
import { NEED_KIND_ICON } from './status.tsx'

/** Màu chủ đạo theo loại nhu cầu chính — cùng một bộ token với cả app, tự đổi theo nền sáng/tối. */
const TINT: Record<NeedKind, { sky: string; hill: string }> = {
  goods: { sky: 'var(--primary)', hill: 'var(--primary)' },
  money: { sky: 'var(--success)', hill: 'var(--success)' },
  labor: { sky: 'var(--cta)', hill: 'var(--cta)' },
  skill: { sky: 'var(--primary)', hill: 'var(--cta)' },
  venue: { sky: 'var(--warning)', hill: 'var(--primary)' },
}

/** Số giả ngẫu nhiên cố định theo id: cùng dự án luôn ra cùng ảnh bìa, dự án khác nhau thì khác nhau. */
function seed(id: string) {
  let h = 2166136261
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return (h >>> 0) / 4294967296
}

/**
 * Ảnh bìa minh hoạ cho dự án: mặt trời (chữ "nắng" của GOM NẮNG) trên dải đồi, tô theo loại nhu cầu chính.
 * Vẽ bằng SVG nên không tải ảnh, nhẹ và đồng bộ ở mọi màn (thẻ dự án, trang chi tiết).
 */
export function ProjectCover({
  id,
  kind,
  muted,
  className,
  children,
}: {
  id: string
  kind: NeedKind
  muted?: boolean
  className?: string
  children?: React.ReactNode
}) {
  const r = seed(id)
  const sunX = 70 + Math.round(r * 180)
  const crest = 52 + Math.round(((r * 7) % 1) * 18)
  const { sky, hill } = TINT[kind]
  const Icon = NEED_KIND_ICON[kind]

  return (
    <div className={cn('relative overflow-hidden', muted && 'grayscale', className)}>
      <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox="0 0 320 120" preserveAspectRatio="xMidYMid slice">
        <rect width="320" height="120" fill={sky} fillOpacity="0.10" />
        <g fill="var(--sun)">
          <circle cx={sunX} cy="40" r="34" fillOpacity="0.14" />
          <circle cx={sunX} cy="40" r="18" fillOpacity="0.55" />
        </g>
        <path d={`M0 ${crest + 14} C 80 ${crest - 8}, 160 ${crest + 28}, 320 ${crest} V120 H0 Z`} fill={hill} fillOpacity="0.16" />
        <path d={`M0 ${crest + 34} C 110 ${crest + 16}, 210 ${crest + 46}, 320 ${crest + 26} V120 H0 Z`} fill={hill} fillOpacity="0.24" />
      </svg>
      <Icon aria-hidden="true" className="absolute right-4 bottom-3 size-10 text-foreground/25 transition-transform duration-300 group-hover:scale-110" />
      <div className="relative h-full">{children}</div>
    </div>
  )
}
