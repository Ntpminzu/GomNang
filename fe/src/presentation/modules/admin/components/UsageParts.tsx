import { toneClass, type Tone } from '@/presentation/components/index.ts'
import { Badge } from '@/presentation/components/ui/badge.tsx'

/** Khung danh sách hai cột (nhãn trái, số phải) dùng chung cho cả hai vai AI. */
export function ListPanel({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4" aria-labelledby={id}>
      <h3 id={id} className="font-semibold">{title}</h3>
      <ul className="mt-3 divide-y">{children}</ul>
    </section>
  )
}

export function ListRow({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
      <span className="flex min-w-0 flex-wrap items-center gap-2 break-words">{label}</span>
      <span className="tabular-nums text-muted-foreground">{value}</span>
    </li>
  )
}

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return <Badge className={toneClass[tone]}>{label}</Badge>
}

export function MethodNote({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground" aria-label={label}>
      <h3 className="font-semibold text-foreground">Cách tính</h3>
      {children}
    </section>
  )
}

/** Bảng rộng hơn màn điện thoại: cuộn ngang trong khung, trang không cuộn ngang. */
export function TableFrame({ id, title, note, children }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3" aria-labelledby={id}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={id} className="font-semibold">{title}</h3>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">{children}</div>
    </section>
  )
}
