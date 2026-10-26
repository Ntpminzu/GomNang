'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, CheckCircle2, ShieldAlert, Undo2, UserRound } from 'lucide-react'
import type { Profile } from '@gomnang/domain/dashboard.ts'
import { canReviewProject } from '@gomnang/domain/rules.ts'
import { getProfile, reviewProject } from '@/libs/api/index.ts'
import { projectRef } from '@/libs/utils/project.ts'
import { ErrorAlert, Field, Panel, a11yProps, linkClass } from '@/presentation/components/index.ts'
import { Button } from '@/presentation/components/ui/button.tsx'
import { Textarea } from '@/presentation/components/ui/textarea.tsx'
import { useAction } from '@/presentation/hooks/use-action.ts'
import type { PanelProps } from '@/presentation/types/project-panels.ts'

/** Người xác minh tự trả lời từng câu trước khi duyệt — gợi ý của người gác cổng không thay được bước này. */
export const REVIEW_CHECKLIST = [
  'Mục tiêu nói rõ làm gì, cho ai, bao nhiêu',
  'Người thụ hưởng có thật và đã được xác nhận',
  'Địa điểm và thời gian cụ thể, làm được',
  'Nhu cầu và số lượng khớp với mục tiêu',
  'Không lộ dữ liệu cá nhân, không có dấu hiệu lừa đảo',
] as const

/** Khối quyết định của người xác minh. Hỏi packages/domain trước khi hiện nút; backend vẫn là nơi chặn thật. */
export function ReviewPanel({ project, user, mode, onChanged }: PanelProps) {
  const { busy, error, run } = useAction()
  const [reason, setReason] = useState('')
  const [checked, setChecked] = useState<boolean[]>(() => REVIEW_CHECKLIST.map(() => false))
  if (user?.role !== 'verifier' || project.status !== 'pending_verification') return null

  const check = canReviewProject(projectRef(project), user, { decision: 'approve' })
  const done = checked.filter(Boolean).length
  const allChecked = done === REVIEW_CHECKLIST.length

  return (
    <Panel title="Quyết định xác minh" titleId="review-title" tone="warning">
      <p className="text-sm text-muted-foreground">
        Bạn là người quyết định. Đọc hồ sơ bên dưới, xem người điều phối, rồi tự đánh dấu từng điểm đã kiểm.
      </p>
      <CoordinatorDossier id={project.coordinator.id} mode={mode} />
      {!check.ok ? (
        <p className="mt-4 text-sm text-muted-foreground">{check.message}</p>
      ) : (
        <>
          <fieldset className="mt-4 space-y-2">
            <legend className="mb-2 flex w-full items-center justify-between gap-2 text-sm font-medium">
              Tự kiểm hồ sơ
              <span className="text-xs font-normal text-muted-foreground tabular-nums" aria-live="polite">
                Đã kiểm {done}/{REVIEW_CHECKLIST.length}
              </span>
            </legend>
            {REVIEW_CHECKLIST.map((item, i) => (
              <label key={item} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm has-checked:border-primary/50 has-checked:bg-primary/5">
                <input
                  type="checkbox"
                  className="size-4 shrink-0 accent-(--primary)"
                  checked={checked.at(i)}
                  onChange={(e) => setChecked((c) => c.map((v, j) => (j === i ? e.target.checked : v)))}
                />
                {item}
              </label>
            ))}
          </fieldset>
          <ErrorAlert error={error} />
          <Field id="review-reason" label="Lý do trả lại" hint="Bắt buộc khi trả lại dự án. Người điều phối sẽ đọc được." className="mt-4">
            <Textarea
              {...a11yProps('review-reason', undefined, true)}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              size="lg"
              disabled={busy || !allChecked}
              aria-describedby={allChecked ? undefined : 'review-approve-hint'}
              onClick={() => run(() => reviewProject(project.id, { decision: 'approve' }, mode), onChanged)}
            >
              <CheckCircle2 aria-hidden="true" />
              Duyệt và công khai
            </Button>
            <Button
              size="lg"
              variant="outline"
              disabled={busy}
              onClick={() => run(() => reviewProject(project.id, { decision: 'reject', reason }, mode), onChanged)}
            >
              <Undo2 aria-hidden="true" />
              Trả lại cho người điều phối
            </Button>
          </div>
          {!allChecked && (
            <p id="review-approve-hint" className="mt-2 text-xs text-muted-foreground">
              Đánh dấu đủ {REVIEW_CHECKLIST.length} điểm đã tự kiểm thì mới duyệt được. Trả lại thì không cần.
            </p>
          )}
        </>
      )}
    </Panel>
  )
}

/** Hồ sơ công khai của người điều phối: danh tính đã xác minh chưa, đã làm bao nhiêu dự án. */
function CoordinatorDossier({ id, mode }: { id: string; mode: PanelProps['mode'] }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  useEffect(() => {
    let active = true
    getProfile(id, mode).then((p) => active && setProfile(p), () => undefined)
    return () => {
      active = false
    }
  }, [id, mode])

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-background p-3 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="text-muted-foreground">Người điều phối:</span>
        <Link href={`/u/${id}`} className={linkClass}>
          {profile?.name ?? 'Xem hồ sơ'}
        </Link>
      </span>
      {profile && (
        <>
          <span className={profile.identityVerified ? 'flex items-center gap-1 text-success' : 'flex items-center gap-1 text-warning'}>
            {profile.identityVerified ? <BadgeCheck className="size-4" aria-hidden="true" /> : <ShieldAlert className="size-4" aria-hidden="true" />}
            {profile.identityVerified ? 'Đã xác minh danh tính' : 'Chưa xác minh danh tính'}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {profile.stats.coordinated} dự án công khai · {profile.stats.completed} đã hoàn thành
          </span>
        </>
      )}
    </div>
  )
}
