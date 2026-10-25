'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Award, BadgeCheck, HeartHandshake, ShieldCheck } from 'lucide-react'
import type { Profile } from '@gomnang/domain/dashboard.ts'
import { getProfile, withDemoMode, type DemoMode } from '@/libs/api/index.ts'
import { formatTime } from '@/libs/utils/date.ts'
import { ApiErrorState, EmptyState, LoadingState, SectionHeading, StatTile, linkClass, toneClass } from '@/presentation/components/index.ts'
import { Badge } from '@/presentation/components/ui/badge.tsx'
import { useLoad } from '@/presentation/hooks/use-load.ts'
import { initials } from '@/presentation/modules/auth/components/AccountMenu.tsx'
import { ProjectCard } from '@/presentation/modules/projects/components/ProjectCard.tsx'

/** Huy hiệu tin cậy (kiểu GlobalGiving): chỉ dựa trên việc đã được người khác xác nhận, không tự khai. */
function badgesOf(p: Profile) {
  return [
    p.identityVerified && { Icon: BadgeCheck, label: 'Đã xác minh danh tính', tone: toneClass.success },
    (p.role === 'verifier') && { Icon: ShieldCheck, label: 'Người xác minh', tone: toneClass.primary },
    p.stats.completed > 0 && { Icon: Award, label: `Hoàn thành ${p.stats.completed} dự án`, tone: toneClass.sun },
    p.stats.projectsHelped >= 3 && { Icon: HeartHandshake, label: 'Người góp sức thường xuyên', tone: toneClass.primary },
  ].filter(Boolean) as { Icon: typeof Award; label: string; tone: string }[]
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { mode, state, reload } = useLoad((m) => getProfile(id, m), [id])
  if (state.status === 'loading') return <LoadingState label="Đang tải hồ sơ…" />
  if (state.status === 'error') return <ApiErrorState error={state.error} onRetry={reload} />
  return <ProfileView profile={state.data} mode={mode} />
}

function ProfileView({ profile: p, mode }: { profile: Profile; mode: DemoMode }) {
  const badges = badgesOf(p)
  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-center gap-5">
        <span aria-hidden="true" className="grid size-20 place-items-center rounded-2xl bg-primary/12 text-2xl font-semibold text-primary">
          {initials(p.name)}
        </span>
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-primary">Hồ sơ công khai</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{p.name}</h1>
          {badges.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Huy hiệu">
              {badges.map(({ Icon, label, tone }) => (
                <li key={label}>
                  <Badge className={`gap-1 ${tone}`}>
                    <Icon aria-hidden="true" />
                    {label}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Dự án điều phối" value={p.stats.coordinated} />
        <StatTile label="Đã hoàn thành" value={p.stats.completed} />
        <StatTile label="Lần góp sức được xác nhận" value={p.stats.confirmedContributions} />
        <StatTile label="Dự án đã giúp" value={p.stats.projectsHelped} />
      </div>
      <p className="-mt-6 text-xs text-muted-foreground">
        Chỉ đếm dự án đã được xác minh công khai và đóng góp đã được người điều phối hoặc người phụ trách tài chính xác nhận.
      </p>

      <section aria-labelledby="coordinated-title">
        <SectionHeading id="coordinated-title">Dự án điều phối</SectionHeading>
        {p.projects.length === 0 ? (
          <EmptyState title="Chưa điều phối dự án công khai nào" />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {p.projects.map((project) => (
              <li key={project.id}>
                <ProjectCard project={project} mode={mode} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="helped-title">
        <SectionHeading id="helped-title">Đã góp sức</SectionHeading>
        {p.helped.length === 0 ? (
          <EmptyState title="Chưa có đóng góp nào được xác nhận" />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {p.helped.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4">
                <div className="min-w-0 flex-1 basis-56">
                  <Link href={withDemoMode(`/projects/${h.projectId}`, mode)} className={`${linkClass} text-sm`}>
                    {h.projectName}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {h.needLabel} · {formatTime(h.createdAt)}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {h.quantity.toLocaleString('vi-VN')} {h.unit}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
