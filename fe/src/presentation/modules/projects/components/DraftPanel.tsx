'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Send, Trash2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { canEditProject } from '@gomnang/domain/rules.ts'
import { deleteProject, submitProject, withDemoMode } from '@/libs/api/index.ts'
import { projectRef } from '@/libs/utils/project.ts'
import { ErrorAlert, Panel } from '@/presentation/components/index.ts'
import { Alert, AlertDescription, AlertTitle } from '@/presentation/components/ui/alert.tsx'
import { Button } from '@/presentation/components/ui/button.tsx'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/presentation/components/ui/dialog.tsx'
import { useAction } from '@/presentation/hooks/use-action.ts'
import type { PanelProps } from '@/presentation/types/project-panels.ts'

/** Khối cho người điều phối khi dự án còn là bản nháp: sửa, gửi đi xác minh, hoặc xoá bản nháp. */
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
        <DeleteDraft project={project} mode={mode} />
      </div>
    </Panel>
  )
}

/** Xoá bản nháp (Q-03) — phải xác nhận; xoá xong về trang Việc của tôi vì trang dự án không còn. */
function DeleteDraft({ project, mode }: Pick<PanelProps, 'project' | 'mode'>) {
  const router = useRouter()
  const { busy, error, run, clear } = useAction()

  return (
    <Dialog onOpenChange={(open) => !open && clear()}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="lg" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 aria-hidden="true" />
          Xoá bản nháp
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Xoá bản nháp này?</DialogTitle>
          <DialogDescription>
            “{project.name}” sẽ biến mất khỏi trang của bạn và không khôi phục được trên ứng dụng.
          </DialogDescription>
        </DialogHeader>
        <ErrorAlert error={error} />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Quay lại
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            size="lg"
            disabled={busy}
            onClick={() =>
              run(
                () => deleteProject(project.id, mode),
                () => {
                  toast.success('Đã xoá bản nháp.')
                  router.replace(withDemoMode('/me', mode))
                },
              )
            }
          >
            {busy ? 'Đang xoá…' : 'Xoá bản nháp'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
