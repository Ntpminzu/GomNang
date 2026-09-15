'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { useLoad } from '@/lib/use-load.ts'
import { Card, CardContent } from '@/components/ui/card'
import { ApiErrorState, EmptyState, LoadingState, PageHeader } from '@/components/states.tsx'
import { VerdictBadge } from './VerificationPanels.tsx'
import { getVerificationQueue } from './verification.api.ts'

export default function VerificationQueuePage() {
  const { state, reload } = useLoad(getVerificationQueue)

  return (
    <>
      <PageHeader
        title="Hàng chờ xác minh"
        description="Dự án chờ lâu nhất nằm trên cùng. Kết quả của người gác cổng chỉ là gợi ý — bạn là người quyết định."
      />

      {state.status === 'loading' && <LoadingState label="Đang tải hàng chờ xác minh…" />}
      {state.status === 'error' && <ApiErrorState error={state.error} onRetry={reload} />}

      {state.status === 'ok' && state.data.length === 0 && (
        <EmptyState title="Không còn dự án nào chờ xác minh">
          <p>Dự án mới gửi lên sẽ xuất hiện ở đây.</p>
        </EmptyState>
      )}

      {state.status === 'ok' && state.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.data.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group/link rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Card className="h-full transition-shadow group-hover/link:shadow-md group-hover/link:ring-primary/40">
                <CardContent className="space-y-2">
                  {p.latestAssessment && <VerdictBadge verdict={p.latestAssessment.verdict} />}
                  <h2 className="font-heading text-base leading-snug font-semibold">{p.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Điều phối: {p.coordinator.name} · {p.location}
                  </p>
                  {p.latestAssessment && p.latestAssessment.signals.length > 0 ? (
                    <ul className="space-y-1.5 pt-1">
                      {p.latestAssessment.signals.map((s) => (
                        <li key={s.code} className="flex gap-2">
                          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                          <span>{s.message}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="pt-1 text-muted-foreground">Không có điểm nào cần bổ sung.</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
