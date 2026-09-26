'use client'

import { Ban, CircleCheck, CircleDashed, FileCheck2, Flag, Play } from 'lucide-react'
import { toast } from 'sonner'
import { MIN_CANCEL_REASON_LENGTH, MIN_REPORT_LENGTH } from '@gomnang/domain/rules.ts'
import type { AuditEntry, ProjectDetail } from '@gomnang/domain/types.ts'
import { cancelProject, completeProject, startProject } from '@/libs/api/index.ts'
import { formatTime } from '@/libs/utils/date.ts'
import { needCoverage } from '@/libs/utils/project.ts'
import { ErrorAlert, Panel, TextDialog } from '@/presentation/components/index.ts'
import { Alert, AlertDescription, AlertTitle } from '@/presentation/components/ui/alert.tsx'
import { Button } from '@/presentation/components/ui/button.tsx'
import { useAction } from '@/presentation/hooks/use-action.ts'
import type { PanelProps } from '@/presentation/types/project-panels.ts'

const lastProjectEntry = (project: ProjectDetail, toState: string): AuditEntry | undefined =>
  project.auditLog.filter((e) => e.entityType === 'project' && e.toState === toState).at(-1)

/**
 * Khối cho người điều phối khi dự án đã công khai: bắt đầu thực hiện, chốt sổ kèm báo cáo, hoặc huỷ.
 * Nút chỉ là gợi ý — luật thật (canStartProject, canCompleteProject, canCancelProject) chạy ở máy chủ.
 */
export function LifecyclePanel({ project, user, mode, onChanged, onShowContributions }: PanelProps & { onShowContributions: () => void }) {
  const { busy, error, run } = useAction()
  if (!user || user.id !== project.coordinator.id) return null
  if (project.status !== 'published' && project.status !== 'in_progress') return null

  const open = project.contributions.filter((c) => c.status === 'committed' || c.status === 'delivered')
  const waiting = open.filter((c) => c.status === 'delivered').length
  const pledged = open.length - waiting
  const { committedPct } = needCoverage(project.needs)

  const cancel = (
    <TextDialog
      id="cancel-reason"
      title="Huỷ dự án này?"
      description={
        <>
          <p>Dự án vẫn hiện công khai kèm lý do bạn ghi, để người đã góp sức hiểu chuyện gì xảy ra. Không hoàn tác được.</p>
          {pledged > 0 && (
            <p>
              <strong className="text-foreground">{pledged} cam kết chưa bàn giao</strong> sẽ tự huỷ.
              {waiting > 0 && ` ${waiting} đóng góp đã bàn giao cần bạn tự liên hệ hoàn trả.`}
            </p>
          )}
        </>
      }
      label="Lý do huỷ"
      placeholder="Ví dụ: Mái ấm đã được một đơn vị khác tài trợ đủ trước ngày phát quà."
      minLength={MIN_CANCEL_REASON_LENGTH}
      maxLength={1000}
      submitLabel="Huỷ dự án"
      variant="destructive"
      success="Đã huỷ dự án và báo công khai lý do."
      onSubmit={(reason) => cancelProject(project.id, { reason }, mode)}
      onDone={onChanged}
    >
      <Button variant="ghost" size="lg" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
        <Ban aria-hidden="true" />
        Huỷ dự án
      </Button>
    </TextDialog>
  )

  if (project.status === 'published') {
    return (
      <Panel title="Bạn đang điều phối dự án này" titleId="lifecycle-title">
        <p className="text-sm text-muted-foreground">
          Dự án đang kêu gọi, đã có người nhận <strong className="text-foreground tabular-nums">{committedPct}%</strong> nhu cầu. Khi
          bắt tay triển khai (đi mua đồ, tập kết, phát quà), bấm <em>Bắt đầu thực hiện</em> để mọi người biết dự án đang chạy — vẫn
          nhận thêm đóng góp trong lúc thực hiện.
        </p>
        <ErrorAlert error={error} />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="lg"
            disabled={busy}
            onClick={() =>
              run(
                () => startProject(project.id, mode),
                () => {
                  toast.success('Dự án đã chuyển sang "Đang thực hiện".')
                  onChanged()
                },
              )
            }
          >
            <Play aria-hidden="true" />
            {busy ? 'Đang cập nhật…' : 'Bắt đầu thực hiện'}
          </Button>
          {cancel}
        </div>
      </Panel>
    )
  }

  const ready = open.length === 0
  return (
    <Panel title="Đang thực hiện — chuẩn bị chốt sổ" titleId="lifecycle-title" tone="cta">
      <p className="text-sm text-muted-foreground">Chốt sổ khi mọi đóng góp đã có kết cục, kèm báo cáo tổng kết công khai.</p>
      <ul className="mt-3 space-y-2 text-sm">
        <li className="flex gap-2">
          {ready ? (
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          ) : (
            <CircleDashed className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          )}
          <span>
            {ready ? (
              'Mọi đóng góp đã được xác nhận hoặc huỷ.'
            ) : (
              <>
                Còn <strong>{open.length}</strong> đóng góp chưa có kết cục
                {waiting > 0 && ` — ${waiting} đang chờ xác nhận`}
                {pledged > 0 && ` — ${pledged} chưa bàn giao`}.{' '}
                <button type="button" onClick={onShowContributions} className="font-medium text-primary underline-offset-4 hover:underline">
                  Xem đóng góp
                </button>
              </>
            )}
          </span>
        </li>
        <li className="flex gap-2">
          <FileCheck2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          Báo cáo tổng kết: kết quả thực tế, số người nhận, phần dư xử lý thế nào.
        </li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <TextDialog
          id="complete-report"
          title="Chốt sổ và công bố báo cáo"
          description={<p>Báo cáo hiện công khai trên trang dự án và không sửa được sau khi chốt. Viết cụ thể, có số liệu.</p>}
          label="Báo cáo tổng kết"
          placeholder="Ví dụ: Ngày 20/9 đã trao 100 suất cơm và 50 hộp sữa cho 40 em ở mái ấm. Dư 5 hộp sữa, đã gửi lại bếp ăn phường. Biên nhận có chữ ký của mái ấm."
          minLength={MIN_REPORT_LENGTH}
          maxLength={5000}
          rows={6}
          submitLabel="Chốt sổ dự án"
          variant="cta"
          success="Dự án đã hoàn thành. Cảm ơn bạn đã điều phối!"
          onSubmit={(report) => completeProject(project.id, { report }, mode)}
          onDone={onChanged}
        >
          <Button variant="cta" size="lg" disabled={!ready}>
            <Flag aria-hidden="true" />
            Hoàn thành dự án
          </Button>
        </TextDialog>
        {cancel}
      </div>
    </Panel>
  )
}

/** Kết cục công khai của dự án: báo cáo tổng kết khi hoàn thành, lý do khi bị huỷ. */
export function ProjectOutcome({ project }: { project: ProjectDetail }) {
  if (project.status === 'completed') {
    const entry = lastProjectEntry(project, 'completed')
    return (
      <Panel
        title={
          <>
            <CircleCheck className="size-5 text-success" aria-hidden="true" />
            Báo cáo tổng kết
          </>
        }
        titleId="report-title"
        tone="success"
      >
        {project.report ? (
          <p className="text-sm leading-relaxed whitespace-pre-line">{project.report}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Dự án hoàn thành trước khi có tính năng báo cáo tổng kết.</p>
        )}
        {entry && (
          <p className="mt-3 text-xs text-muted-foreground">
            Chốt sổ bởi {entry.actor.name} lúc {formatTime(entry.at)}
          </p>
        )}
      </Panel>
    )
  }

  if (project.status === 'cancelled') {
    const entry = lastProjectEntry(project, 'cancelled')
    return (
      <Alert variant="destructive" className="border-destructive/40">
        <Ban aria-hidden="true" />
        <AlertTitle>Dự án đã huỷ — không nhận thêm đóng góp</AlertTitle>
        <AlertDescription>
          {entry?.reason && <p>Lý do: {entry.reason}</p>}
          {entry && (
            <p className="text-xs">
              {entry.actor.name} huỷ lúc {formatTime(entry.at)}. Các cam kết chưa bàn giao đã tự huỷ.
            </p>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
