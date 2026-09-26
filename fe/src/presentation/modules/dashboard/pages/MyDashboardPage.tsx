'use client'

import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  FilePen,
  Flag,
  HandHeart,
  PackageCheck,
  Play,
  ReceiptText,
  Send,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import type { TaskKind } from '@gomnang/domain/dashboard.ts'
import { getMyDashboard, withDemoMode } from '@/libs/api/index.ts'
import { formatTime } from '@/libs/utils/date.ts'
import { ApiErrorState, DemoSwitch, EmptyState, LoadingState, PageHeader, SectionHeading, StatTile, linkClass } from '@/presentation/components/index.ts'
import { Button } from '@/presentation/components/ui/button.tsx'
import { useLoad } from '@/presentation/hooks/use-load.ts'
import { ContributionStatusBadge } from '@/presentation/modules/contributions/index.ts'
import { ProjectCard } from '@/presentation/modules/projects/components/ProjectCard.tsx'
import { useSession } from '@/presentation/providers/SessionProvider.tsx'

/** Mỗi loại việc: biểu tượng, nút bấm, và tab của trang dự án cần mở. */
const TASK: Record<TaskKind, { Icon: LucideIcon; action: string; tab?: string }> = {
  review_project: { Icon: ShieldCheck, action: 'Xác minh' },
  confirm_contributions: { Icon: PackageCheck, action: 'Xác nhận', tab: 'contributions' },
  review_expenses: { Icon: ReceiptText, action: 'Duyệt chi', tab: 'ledger' },
  fix_draft: { Icon: FilePen, action: 'Sửa lại' },
  deliver_pledge: { Icon: HandHeart, action: 'Báo bàn giao', tab: 'contributions' },
  complete_project: { Icon: Flag, action: 'Chốt sổ' },
  start_project: { Icon: Play, action: 'Bắt đầu' },
  submit_draft: { Icon: Send, action: 'Gửi xác minh' },
}

export default function MyDashboardPage() {
  const { user, ready } = useSession()
  if (!ready) return <LoadingState label="Đang kiểm tra đăng nhập…" />
  if (!user)
    return (
      <EmptyState title="Đăng nhập để xem việc của bạn">
        <p>Trang này gom mọi việc đang chờ bạn: đóng góp cần xác nhận, cam kết cần bàn giao, khoản chi cần duyệt.</p>
        <Button asChild>
          <Link href="/login?next=/me">Đăng nhập</Link>
        </Button>
      </EmptyState>
    )
  return <Dashboard name={user.name} />
}

function Dashboard({ name }: { name: string }) {
  const { mode, state, reload } = useLoad(getMyDashboard)

  return (
    <>
      <PageHeader
        eyebrow={`Xin chào, ${name}`}
        title="Việc của tôi"
        description="Việc cần bạn xử lý nằm trên cùng, việc làm chậm người khác được xếp trước."
      />
      <DemoSwitch mode={mode} basePath="/me" />
      {state.status === 'loading' && <LoadingState label="Đang tải việc của bạn…" />}
      {state.status === 'error' && <ApiErrorState error={state.error} onRetry={reload} />}
      {state.status === 'ok' && (
        <div className="space-y-10">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <StatTile label="Việc chờ" value={state.data.tasks.length} />
            <StatTile label="Điều phối" value={state.data.projects.filter((p) => p.role === 'coordinator').length} />
            <StatTile label="Góp sức" value={state.data.contributions.filter((c) => c.status === 'confirmed').length} hint="đã xác nhận" />
          </div>

          <section aria-labelledby="tasks-title">
            <SectionHeading id="tasks-title">Cần bạn xử lý</SectionHeading>
            {state.data.tasks.length === 0 ? (
              <EmptyState title="Bạn đã xử lý hết việc" icon={<CheckCircle2 aria-hidden="true" />}>
                <p>Khi có đóng góp cần xác nhận hay khoản chi cần duyệt, việc sẽ hiện ở đây.</p>
              </EmptyState>
            ) : (
              <ul className="space-y-3">
                {state.data.tasks.map((t) => {
                  const { Icon, action, tab } = TASK[t.kind]
                  const href = withDemoMode(`/projects/${t.projectId}${tab ? `?tab=${tab}` : ''}`, mode)
                  return (
                    <li key={`${t.kind}-${t.projectId}`} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cta/10 text-cta" aria-hidden="true">
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1 basis-56">
                        <p className="text-sm font-medium">{t.detail}</p>
                        <p className="truncate text-xs text-muted-foreground">{t.projectName}</p>
                      </div>
                      <Button asChild size="lg" variant="outline">
                        <Link href={href}>
                          {action}
                          <ArrowRight aria-hidden="true" />
                          <span className="sr-only">: {t.projectName}</span>
                        </Link>
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="my-projects-title">
            <SectionHeading
              id="my-projects-title"
              action={
                <Button asChild variant="cta" size="lg">
                  <Link href={withDemoMode('/projects/new', mode)}>Tạo dự án</Link>
                </Button>
              }
            >
              Dự án của tôi
            </SectionHeading>
            {state.data.projects.length === 0 ? (
              <EmptyState title="Bạn chưa điều phối dự án nào">
                <p>Có việc tốt muốn làm cùng hàng xóm? Tạo dự án, ghi rõ cần gì, người xác minh sẽ duyệt trước khi công khai.</p>
              </EmptyState>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {state.data.projects.map((p) => (
                  <li key={p.id} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">{p.role === 'coordinator' ? 'Bạn điều phối' : 'Bạn phụ trách tài chính'}</p>
                    <ProjectCard project={p} mode={mode} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="my-contributions-title">
            <SectionHeading id="my-contributions-title">Đóng góp của tôi</SectionHeading>
            {state.data.contributions.length === 0 ? (
              <EmptyState title="Bạn chưa góp sức lần nào">
                <p>
                  Xem các dự án đang kêu gọi ở{' '}
                  <Link href={withDemoMode('/', mode)} className={linkClass}>
                    trang Khám phá
                  </Link>
                  .
                </p>
              </EmptyState>
            ) : (
              <ul className="divide-y rounded-xl border bg-card">
                {state.data.contributions.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                    <div className="min-w-0 flex-1 basis-56">
                      <Link href={withDemoMode(`/projects/${c.projectId}?tab=contributions`, mode)} className={`${linkClass} text-sm`}>
                        {c.projectName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {c.needLabel} · {formatTime(c.createdAt)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {c.quantity.toLocaleString('vi-VN')} {c.unit}
                    </span>
                    <ContributionStatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  )
}
