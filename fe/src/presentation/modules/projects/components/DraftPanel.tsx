'use client'

import Link from 'next/link'
import { Pencil, Send, Undo2 } from 'lucide-react'
import { canEditProject } from '@gomnang/domain/rules.ts'
import { submitProject, withDemoMode } from '@/libs/api/index.ts'
import { projectRef } from '@/libs/utils/project.ts'
import { ErrorAlert, Panel } from '@/presentation/components/index.ts'
import { Alert, AlertDescription, AlertTitle } from '@/presentation/components/ui/alert.tsx'
import { Button } from '@/presentation/components/ui/button.tsx'
import { useAction } from '@/presentation/hooks/use-action.ts'
import type { PanelProps } from '@/presentation/types/project-panels.ts'

/** Khối cho người điều phối khi dự án còn là bản nháp: sửa, hoặc gửi đi xác minh. */
export function DraftPanel({ project, user, mode, onChanged }: PanelProps) {
  const { busy, error, run } = useAction()
  if (!user || !canEditProject(projectRef(project), user).ok) return null

  return (
    <Panel title="Bản nháp — chưa công khai" titleId="draft-panel-title" tone="cta">
      {project.rejectionReason && (
        <Alert className="my-3 border-warning/40 bg-warning/5">
          <Undo2 aria-hidden="true" />
          <AlertTitle>Người xác minh đã trả lại dự án</AlertTitle>
          <AlertDescription>{project.rejectionReason}</AlertDescription>
        </Alert>
      )}
      <p className="text-sm text-muted-foreground">
        Sửa cho đủ thông tin rồi gửi đi xác minh. Dự án chỉ hiện công khai sau khi người xác minh duyệt.
      </p>
      <ErrorAlert error={error} />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="lg">
          <Link href={withDemoMode(`/projects/${project.id}/edit`, mode)}>
            <Pencil aria-hidden="true" />
            Sửa dự án
          </Link>
        </Button>
        <Button variant="cta" size="lg" disabled={busy} onClick={() => run(() => submitProject(project.id, mode), onChanged)}>
          <Send aria-hidden="true" />
          {busy ? 'Đang gửi…' : 'Gửi xác minh'}
        </Button>
      </div>
    </Panel>
  )
}
