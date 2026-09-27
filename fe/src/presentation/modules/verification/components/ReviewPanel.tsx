'use client'

import { useState } from 'react'
import { CheckCircle2, Undo2 } from 'lucide-react'
import { canReviewProject } from '@gomnang/domain/rules.ts'
import { reviewProject } from '@/libs/api/index.ts'
import { projectRef } from '@/libs/utils/project.ts'
import { ErrorAlert, Field, Panel, a11yProps } from '@/presentation/components/index.ts'
import { Button } from '@/presentation/components/ui/button.tsx'
import { Textarea } from '@/presentation/components/ui/textarea.tsx'
import { useAction } from '@/presentation/hooks/use-action.ts'
import type { PanelProps } from '@/presentation/types/project-panels.ts'

/** Khối duyệt hoặc trả lại. Hỏi packages/domain trước khi hiện nút; backend vẫn là nơi chặn thật. */
export function ReviewPanel({ project, user, mode, onChanged }: PanelProps) {
  const { busy, error, run } = useAction()
  const [reason, setReason] = useState('')
  if (!user?.isVerifier || project.status !== 'pending_verification') return null

  const check = canReviewProject(projectRef(project), user, { decision: 'approve' })

  return (
    <Panel title="Quyết định xác minh" titleId="review-title" tone="warning">
      {!check.ok ? (
        <p className="text-sm text-muted-foreground">{check.message}</p>
      ) : (
        <>
          <ErrorAlert error={error} />
          <Field id="review-reason" label="Lý do trả lại" hint="Bắt buộc khi trả lại dự án. Người điều phối sẽ đọc được." className="mt-2">
            <Textarea
              {...a11yProps('review-reason', undefined, true)}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="lg" disabled={busy} onClick={() => run(() => reviewProject(project.id, { decision: 'approve' }, mode), onChanged)}>
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
        </>
      )}
    </Panel>
  )
}
