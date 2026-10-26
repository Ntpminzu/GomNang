'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Bot, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { canRequestAiAssessment } from '@gomnang/domain/rules.ts'
import type { AiRunInfo, ChatModelOption, ChatProvider } from '@gomnang/domain/types.ts'
import { requestAiAssessment, withDemoMode } from '@/libs/api/index.ts'
import { listChatModels } from '@/libs/api/chat.ts'
import { formatTime } from '@/libs/utils/date.ts'
import { projectRef } from '@/libs/utils/project.ts'
import { ErrorAlert, linkClass, Panel } from '@/presentation/components/index.ts'
import { Badge } from '@/presentation/components/ui/badge.tsx'
import { Button } from '@/presentation/components/ui/button.tsx'
import { NativeSelect, NativeSelectOption } from '@/presentation/components/ui/native-select.tsx'
import { useAction } from '@/presentation/hooks/use-action.ts'
import type { PanelProps } from '@/presentation/types/project-panels.ts'
import { VerdictBadge } from './status.tsx'

/** Kết quả của người gác cổng. Chỉ là gợi ý cho người xác minh — không tự đổi trạng thái dự án. */
export function AssessmentPanel(props: PanelProps) {
  const { project, user, mode } = props
  const assessment = project.latestAssessment
  if (!assessment) return null
  const canAskAi = !!user && canRequestAiAssessment(projectRef(project), user).ok

  return (
    <Panel
      title={
        <>
          <Bot className="size-4 text-primary" aria-hidden="true" />
          Người gác cổng
          <span className="rounded-full border px-2 py-0.5 text-xs font-normal text-muted-foreground">Công cụ hỗ trợ</span>
        </>
      }
      titleId="assessment-title"
      aside={<VerdictBadge verdict={assessment.verdict} />}
    >
      <p className="text-sm text-muted-foreground">
        {assessment.source === 'rules' ? 'Kiểm tra theo quy tắc, chưa dùng AI' : 'Quy tắc kết hợp đánh giá bằng mô hình AI'} ·{' '}
        {formatTime(assessment.createdAt)}. Đây chỉ là gợi ý — người xác minh mới là người quyết định.
      </p>
      {assessment.signals.length === 0 ? (
        <p className="mt-2 text-sm font-medium">Không phát hiện điểm nào cần bổ sung.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {assessment.signals.map((signal, i) => (
            <li key={`${signal.code}-${i}`} className="flex gap-2 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <span>
                {signal.code.startsWith('AI_') && (
                  <Badge variant="outline" className="mr-1.5 align-middle font-normal">
                    AI
                  </Badge>
                )}
                {signal.message}
              </span>
            </li>
          ))}
        </ul>
      )}
      {assessment.ai && <AiRunDetails ai={assessment.ai} />}
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
      {canAskAi && <AskAi {...props} />}
    </Panel>
  )
}

/** Thông số của lần gọi AI tạo ra đánh giá này — đề yêu cầu log prompt version, token, latency và chi phí. */
function AiRunDetails({ ai }: { ai: AiRunInfo }) {
  const items: [string, string][] = [
    ['Model', `${ai.model} (${ai.provider === 'ollama' ? 'chạy trên máy' : 'Google Gemini'})`],
    ['Prompt', ai.promptVersion],
    ['Thời gian', `${(ai.latencyMs / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} giây · ${ai.attempts} lần gọi`],
    ['Token', `${ai.inputTokens.toLocaleString('vi-VN')} vào · ${ai.outputTokens.toLocaleString('vi-VN')} ra`],
    ['Chi phí', ai.costUsd === 0 ? '0 USD (không tính phí API)' : `${ai.costUsd.toLocaleString('en-US', { maximumSignificantDigits: 3 })} USD`],
  ]
  return (
    <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg bg-muted/50 p-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium break-words tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Người xác minh nhờ AI soát hồ sơ. AI trả JSON theo schema; backend gộp với quy tắc (AI chỉ nâng mức cảnh báo). */
function AskAi({ project, mode, onChanged }: PanelProps) {
  const { busy, error, run } = useAction()
  const [models, setModels] = useState<ChatModelOption[]>([])
  const [model, setModel] = useState<ChatProvider>('ollama')

  useEffect(() => {
    let active = true
    listChatModels().then(
      (list) => {
        if (!active) return
        const available = list.filter((m) => m.available)
        setModels(available)
        if (available[0]) setModel(available[0].id)
      },
      () => undefined,
    )
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      <p className="text-sm text-muted-foreground">
        Nhờ AI đọc hồ sơ và gợi ý điểm cần hỏi lại người điều phối (người thụ hưởng, kế hoạch, tiền, lịch, dữ liệu cá nhân).
        AI không duyệt dự án và không hạ được cảnh báo của quy tắc.
      </p>
      <ErrorAlert error={error} />
      <div className="flex flex-wrap items-center gap-2">
        {models.length > 1 && (
          <>
            <label htmlFor="ai-model" className="sr-only">
              Chọn mô hình AI
            </label>
            <NativeSelect id="ai-model" className="h-10 w-48" value={model} disabled={busy} onChange={(e) => setModel(e.target.value as ChatProvider)}>
              {models.map((m) => (
                <NativeSelectOption key={m.id} value={m.id}>
                  {m.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </>
        )}
        <Button
          variant="outline"
          size="lg"
          disabled={busy}
          onClick={() =>
            run(
              () => requestAiAssessment(project.id, { model }, mode),
              () => {
                toast.success('Đã thêm đánh giá của AI. Hãy đọc kỹ trước khi quyết định.')
                return onChanged()
              },
            )
          }
        >
          <Sparkles aria-hidden="true" />
          {busy ? 'AI đang đọc hồ sơ…' : 'Đánh giá bằng AI'}
        </Button>
      </div>
      {busy && (
        <p className="text-xs text-muted-foreground" role="status">
          Mô hình chạy trên máy có thể mất tới một phút.
        </p>
      )}
    </div>
  )
}
