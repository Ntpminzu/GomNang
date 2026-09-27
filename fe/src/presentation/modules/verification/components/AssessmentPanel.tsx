import Link from 'next/link'
import { AlertTriangle, Bot } from 'lucide-react'
import type { Assessment } from '@gomnang/domain/types.ts'
import { withDemoMode, type DemoMode } from '@/libs/api/index.ts'
import { formatTime } from '@/libs/utils/date.ts'
import { linkClass, Panel } from '@/presentation/components/index.ts'
import { VerdictBadge } from './status.tsx'

/** Kết quả của người gác cổng. Chỉ là gợi ý cho người xác minh — không tự đổi trạng thái dự án. */
export function AssessmentPanel({ assessment, mode }: { assessment: Assessment; mode: DemoMode }) {
  return (
    <Panel
      title={
        <>
          <Bot className="size-4 text-primary" aria-hidden="true" />
          Người gác cổng
        </>
      }
      titleId="assessment-title"
      aside={<VerdictBadge verdict={assessment.verdict} />}
    >
      <p className="text-sm text-muted-foreground">
        {assessment.source === 'rules' ? 'Kiểm tra theo quy tắc, chưa dùng AI' : 'Đánh giá bằng mô hình AI'} ·{' '}
        {formatTime(assessment.createdAt)}. Đây chỉ là gợi ý — người xác minh mới là người quyết định.
      </p>
      {assessment.signals.length === 0 ? (
        <p className="mt-2 text-sm font-medium">Không phát hiện điểm nào cần bổ sung.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {assessment.signals.map((signal) => (
            <li key={signal.code} className="flex gap-2 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              {signal.message}
            </li>
          ))}
        </ul>
      )}
      {assessment.similarProjects.length > 0 && (
        <p className="mt-3 text-sm">
          Dự án tương tự:{' '}
          {assessment.similarProjects.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ', '}
              <Link className={linkClass} href={withDemoMode(`/projects/${p.id}`, mode)}>
                {p.name}
              </Link>{' '}
              <span className="text-muted-foreground tabular-nums">({Math.round(p.similarity * 100)}%)</span>
            </span>
          ))}
        </p>
      )}
    </Panel>
  )
}
