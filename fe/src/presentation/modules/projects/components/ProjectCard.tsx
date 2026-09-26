import Link from 'next/link'
import { CalendarDays, MapPin, Users } from 'lucide-react'
import type { NeedKind, ProjectSummary } from '@gomnang/domain/types.ts'
import { withDemoMode, type DemoMode } from '@/libs/api/index.ts'
import { daysUntil, formatDate, needCoverage } from '@/libs/utils/project.ts'
import { NEED_KIND_ICON, NeedKindBadge, StatusBadge } from './status.tsx'

/** Nhãn thời gian ngắn gọn cho thẻ: sắp diễn ra thì đếm ngày, đang diễn ra hoặc đã qua thì ghi ngày. */
function whenLabel(p: ProjectSummary) {
  const days = daysUntil(p.startDate)
  if (p.status === 'completed') return `Đã kết thúc ${formatDate(p.endDate)}`
  if (days > 1) return `Còn ${days} ngày · ${formatDate(p.startDate)}`
  if (days === 1) return 'Diễn ra ngày mai'
  if (days === 0) return 'Diễn ra hôm nay'
  return `Từ ${formatDate(p.startDate)}`
}

export function ProjectCard({ project: p, mode }: { project: ProjectSummary; mode: DemoMode }) {
  const { committedPct, openNeeds } = needCoverage(p.needs)
  const kinds = [...new Set(p.needs.map((n) => n.kind))] as NeedKind[]
  const CoverIcon = NEED_KIND_ICON[kinds[0] ?? 'goods']

  return (
    <Link
      href={withDemoMode(`/projects/${p.id}`, mode)}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs transition-[box-shadow,border-color] duration-200 hover:border-primary/40 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="relative flex h-28 items-end justify-between bg-gradient-to-br from-primary/15 via-sun/15 to-cta/10 p-4">
        <StatusBadge status={p.status} className="bg-card/90 backdrop-blur" />
        <CoverIcon aria-hidden="true" className="size-12 text-primary/35 transition-transform duration-300 group-hover:scale-110" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 text-base leading-snug font-semibold text-balance">{p.name}</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <Users className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{p.beneficiaryGroup}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{p.location}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
            <span>{whenLabel(p)}</span>
          </li>
        </ul>

        <div className="mt-auto space-y-1.5 pt-1">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold tabular-nums">{committedPct}% nhu cầu</span>
            <span className="text-xs text-muted-foreground">
              {openNeeds > 0 ? `còn thiếu ${openNeeds}/${p.needs.length} hạng mục` : 'đã đủ cam kết'}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={committedPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${p.name}: đã có cam kết cho ${committedPct}% nhu cầu`}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${committedPct}%` }} />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1.5">
            {kinds.map((kind) => (
              <NeedKindBadge key={kind} kind={kind} />
            ))}
          </div>
        </div>
      </div>
    </Link>
  )
}
