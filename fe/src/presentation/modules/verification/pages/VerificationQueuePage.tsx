'use client'

import Link from 'next/link'
import { getVerificationQueue, withDemoMode } from '@/libs/api/index.ts'
import { useLoad } from '@/presentation/hooks/use-load.ts'
import { ApiErrorState, DemoSwitch, EmptyState, LoadingState } from '@/presentation/components/index.ts'
import { VerdictBadge } from '@/presentation/modules/verification/index.ts'

export default function VerificationQueuePage() {
  const { mode, state, reload } = useLoad(getVerificationQueue)

  return (
    <>
      <div className="page-head">
        <h1>Hàng chờ xác minh</h1>
        <p className="lead">
          Dự án chờ lâu nhất nằm trên cùng. Kết quả của người gác cổng chỉ là gợi ý — bạn là người quyết định.
        </p>
      </div>

      <DemoSwitch mode={mode} basePath="/verify" />

      {state.status === 'loading' && <LoadingState label="Đang tải hàng chờ xác minh…" />}
      {state.status === 'error' && <ApiErrorState error={state.error} onRetry={reload} />}

      {state.status === 'ok' && state.data.length === 0 && (
        <EmptyState title="Không còn dự án nào chờ xác minh">
          <p>Dự án mới gửi lên sẽ xuất hiện ở đây.</p>
        </EmptyState>
      )}

      {state.status === 'ok' && state.data.length > 0 && (
        <div className="grid">
          {state.data.map((p) => (
            <Link key={p.id} href={withDemoMode(`/projects/${p.id}`, mode)} className="card card-link">
              {p.latestAssessment && <VerdictBadge verdict={p.latestAssessment.verdict} />}
              <h2 className="card-title">{p.name}</h2>
              <p className="card-meta">
                Điều phối: {p.coordinator.name} · {p.location}
              </p>
              {p.latestAssessment && p.latestAssessment.signals.length > 0 ? (
                <ul className="signal-list">
                  {p.latestAssessment.signals.map((s) => (
                    <li key={s.code}>{s.message}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Không có điểm nào cần bổ sung.</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
