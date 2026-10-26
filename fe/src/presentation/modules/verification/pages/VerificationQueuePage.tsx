'use client'

import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Clock, MapPin, UserRound } from 'lucide-react'
import { getVerificationQueue, withDemoMode } from '@/libs/api/index.ts'
import { formatTime } from '@/libs/utils/date.ts'
import { ApiErrorState, DemoSwitch, EmptyState, LoadingState, PageHeader } from '@/presentation/components/index.ts'
import { Button } from '@/presentation/components/ui/button.tsx'
import { useLoad } from '@/presentation/hooks/use-load.ts'
import { VerdictBadge } from '@/presentation/modules/verification/index.ts'
import { useSession } from '@/presentation/providers/SessionProvider.tsx'

export default function VerificationQueuePage() {
  const { user, ready } = useSession()
  if (!ready) return <LoadingState label="Đang kiểm tra quyền truy cập…" />
  if ((user?.role === 'verifier') !== true)
    return (
      <EmptyState title="Không có quyền xem trang này">
        <p>Chỉ người xác minh mới xem được hàng chờ xác minh.</p>
        <Button asChild>
          <Link href="/">Về trang dự án</Link>
        </Button>
      </EmptyState>
    )
  return <VerificationQueue />
}

function VerificationQueue() {
  const { mode, state, reload } = useLoad(getVerificationQueue)
  const flagged = state.status === 'ok' ? state.data.filter((p) => p.latestAssessment && p.latestAssessment.verdict !== 'PASS').length : 0

  return (
    <>
      <PageHeader
        eyebrow="Người xác minh"
        title="Hàng chờ xác minh"
        description="Dự án chờ lâu nhất nằm trên cùng. Mở từng hồ sơ, tự kiểm và quyết định; gợi ý tự động của người gác cổng chỉ để tham khảo."
      >
        {state.status === 'ok' && (
          <p className="text-sm text-muted-foreground" role="status">
            {state.data.length} dự án chờ · {flagged} cần xem kỹ
          </p>
        )}
      </PageHeader>

      <DemoSwitch mode={mode} basePath="/verify" />

      {state.status === 'loading' && <LoadingState label="Đang tải hàng chờ xác minh…" />}
      {state.status === 'error' && <ApiErrorState error={state.error} onRetry={reload} />}

      {state.status === 'ok' && state.data.length === 0 && (
        <EmptyState title="Không còn dự án nào chờ xác minh" icon={<CheckCircle2 aria-hidden="true" />}>
          <p>Dự án mới gửi lên sẽ xuất hiện ở đây.</p>
        </EmptyState>
      )}

      {state.status === 'ok' && state.data.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {state.data.map((p) => {
            const signals = p.latestAssessment?.signals ?? []
            return (
              <li key={p.id}>
                <Link
                  href={withDemoMode(`/projects/${p.id}`, mode)}
                  className="flex h-full flex-col gap-3 rounded-2xl border bg-card p-5 transition-[box-shadow,border-color] hover:border-primary/40 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <div className="flex items-center justify-between gap-2">
                    {p.latestAssessment ? (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        Gợi ý tự động <VerdictBadge verdict={p.latestAssessment.verdict} />
                      </span>
                    ) : (
                      <span />
                    )}
                    {p.latestAssessment && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3.5" aria-hidden="true" />
                        gửi {formatTime(p.latestAssessment.createdAt)}
                      </span>
                    )}
                  </div>
                  <h2 className="font-semibold text-balance">{p.name}</h2>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-1.5">
                      <UserRound className="size-4" aria-hidden="true" />
                      Điều phối: {p.coordinator.name}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <MapPin className="size-4" aria-hidden="true" />
                      {p.location}
                    </li>
                  </ul>
                  {signals.length > 0 ? (
                    <ul className="mt-auto space-y-1.5 rounded-xl bg-warning/8 p-3">
                      {signals.map((s) => (
                        <li key={s.code} className="flex gap-2 text-sm">
                          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                          {s.message}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-auto flex items-center gap-1.5 text-sm text-success">
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      Không có điểm nào cần bổ sung.
                    </p>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
