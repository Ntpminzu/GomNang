'use client'

import Link from 'next/link'
import { BadgeCheck, CalendarDays, HandHeart, Link2, Share2, ShieldCheck, Users, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { ACCEPTING_STATUSES, type ProjectDetail } from '@gomnang/domain/types.ts'
import { formatTime } from '@/libs/utils/date.ts'
import { daysUntil, formatDate, needCoverage } from '@/libs/utils/project.ts'
import { Button } from '@/presentation/components/ui/button.tsx'
import { initials } from '@/presentation/modules/auth/components/AccountMenu.tsx'

async function share(project: ProjectDetail) {
  const url = window.location.href.split('?')[0]
  // Điện thoại có bảng chia sẻ của hệ điều hành; máy tính thì chép link.
  if (navigator.share) {
    await navigator.share({ title: project.name, text: `Cùng góp sức: ${project.name}`, url }).catch(() => undefined)
    return
  }
  await navigator.clipboard.writeText(url)
  toast.success('Đã chép link dự án.')
}

export function ProjectSidebar({ project, onJoin }: { project: ProjectDetail; onJoin: () => void }) {
  const { committedPct, confirmedPct, openNeeds } = needCoverage(project.needs)
  const contributors = new Set(project.contributions.filter((c) => c.status !== 'cancelled').map((c) => c.contributor.id)).size
  const days = daysUntil(project.startDate)
  const approval = project.auditLog.filter((e) => e.entityType === 'project' && e.toState === 'published').at(-1)
  const accepting = ACCEPTING_STATUSES.includes(project.status)

  return (
    <aside className="space-y-4 lg:sticky lg:top-24" aria-label="Tóm tắt dự án">
      <section className="rounded-2xl border bg-card p-5 shadow-xs" aria-labelledby="progress-title">
        <h2 id="progress-title" className="sr-only">
          Tiến độ
        </h2>
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-semibold tabular-nums">{committedPct}%</span>
          <span className="text-sm text-muted-foreground">nhu cầu đã có người nhận</span>
        </div>
        <div
          className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={committedPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Đã có cam kết cho ${committedPct}% nhu cầu, ${confirmedPct}% đã được xác nhận`}
        >
          <div className="flex h-full" style={{ width: `${committedPct}%` }}>
            <div className="h-full bg-success" style={{ width: committedPct ? `${(confirmedPct / committedPct) * 100}%` : 0 }} />
            <div className="h-full flex-1 bg-primary" />
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Đã xác nhận</dt>
            <dd className="font-semibold tabular-nums">{confirmedPct}%</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Người góp sức</dt>
            <dd className="font-semibold tabular-nums">{contributors}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Hạng mục còn thiếu</dt>
            <dd className="font-semibold tabular-nums">
              {openNeeds}/{project.needs.length}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Bắt đầu</dt>
            <dd className="font-semibold">
              {formatDate(project.startDate)}
              {days > 0 && <span className="block text-xs font-normal text-muted-foreground">còn {days} ngày</span>}
            </dd>
          </div>
        </dl>
        <div className="mt-5 grid gap-2">
          {accepting && openNeeds > 0 && (
            <Button variant="cta" size="xl" onClick={onJoin}>
              <HandHeart aria-hidden="true" />
              Góp sức cho dự án
            </Button>
          )}
          <Button variant="outline" size="lg" onClick={() => void share(project)}>
            {typeof navigator !== 'undefined' && 'share' in navigator ? <Share2 aria-hidden="true" /> : <Link2 aria-hidden="true" />}
            Chia sẻ dự án
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5" aria-labelledby="people-title">
        <h2 id="people-title" className="mb-3 text-sm font-semibold">
          Người chịu trách nhiệm
        </h2>
        <ul className="space-y-3 text-sm">
          <Person id={project.coordinator.id} name={project.coordinator.name} role="Người điều phối" />
          {project.treasurer && (
            <Person
              id={project.treasurer.id}
              name={project.treasurer.name}
              role="Phụ trách tài chính"
              badge={
                <span className="inline-flex items-center gap-1 text-xs text-success">
                  <BadgeCheck className="size-3.5" aria-hidden="true" />
                  đã xác minh danh tính
                </span>
              }
            />
          )}
        </ul>
        {!project.treasurer && (
          <p className="mt-3 flex gap-2 text-xs text-muted-foreground">
            <Wallet className="size-4 shrink-0" aria-hidden="true" />
            Dự án không nhận tiền nên không cần người phụ trách tài chính.
          </p>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5 text-sm" aria-labelledby="trust-title">
        <h2 id="trust-title" className="mb-3 font-semibold">
          Vì sao có thể tin dự án này
        </h2>
        <ul className="space-y-2.5 text-muted-foreground">
          {approval ? (
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              <span>
                Đã được <strong className="text-foreground">{approval.actor.name}</strong> xác minh lúc {formatTime(approval.at)}.
              </span>
            </li>
          ) : (
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Chưa được xác minh — dự án chưa công khai.
            </li>
          )}
          <li className="flex gap-2">
            <Users className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            Người nhận tiền và người xác nhận chi là hai người khác nhau.
          </li>
          <li className="flex gap-2">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            Mọi thay đổi có ngày giờ, người thực hiện trong sổ ghi vết — không ai sửa được.
          </li>
        </ul>
      </section>
    </aside>
  )
}

function Person({ id, name, role, badge }: { id: string; name: string; role: string; badge?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
        {initials(name)}
      </span>
      <div className="min-w-0">
        <Link href={`/u/${id}`} className="block truncate font-medium underline-offset-4 hover:text-primary hover:underline">
          {name}
        </Link>
        <p className="text-xs text-muted-foreground">{role}</p>
        {badge}
      </div>
    </li>
  )
}
