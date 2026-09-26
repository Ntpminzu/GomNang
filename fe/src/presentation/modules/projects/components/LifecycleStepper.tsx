import { Check } from 'lucide-react'
import { PROJECT_STATUSES, STATUS_LABEL, type AuditEntry, type ProjectStatus } from '@gomnang/domain/types.ts'
import { cn } from '@/libs/utils/cn.ts'
import { formatTime } from '@/libs/utils/date.ts'

/** Dòng đời dự án. Mốc thời gian lấy từ sổ ghi vết — không lưu riêng nên không bao giờ lệch với lịch sử thật. */
export function LifecycleStepper({ status, auditLog }: { status: ProjectStatus; auditLog: AuditEntry[] }) {
  const current = PROJECT_STATUSES.indexOf(status)
  const reachedAt = (s: ProjectStatus) =>
    auditLog.filter((e) => e.entityType === 'project' && e.toState === s).at(-1)?.at

  return (
    <ol aria-label="Dòng đời dự án" className="grid grid-cols-5 gap-1">
      {PROJECT_STATUSES.map((s, i) => {
        const done = i < current
        const active = i === current
        const at = reachedAt(s)
        return (
          <li key={s} aria-current={active ? 'step' : undefined} className="flex min-w-0 flex-col gap-2">
            <div className={cn('h-1.5 rounded-full', done ? 'bg-primary' : active ? 'bg-cta' : 'bg-muted')} />
            <div className="flex min-w-0 items-start gap-1.5">
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-semibold',
                  done ? 'bg-primary text-primary-foreground' : active ? 'bg-cta text-cta-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              <div className="min-w-0">
                <p className={cn('text-xs leading-tight font-medium', !done && !active && 'text-muted-foreground')}>{STATUS_LABEL[s]}</p>
                {at && (done || active) && <p className="hidden text-[11px] text-muted-foreground sm:block">{formatTime(at)}</p>}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
