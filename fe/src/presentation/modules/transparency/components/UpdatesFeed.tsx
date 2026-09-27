'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Megaphone, Send } from 'lucide-react'
import { toast } from 'sonner'
import { MIN_UPDATE_LENGTH } from '@gomnang/domain/rules.ts'
import { PUBLIC_PROJECT_STATUSES, type ProjectDetail, type UserRef } from '@gomnang/domain/types.ts'
import { postUpdate } from '@/libs/api/index.ts'
import { formatTime } from '@/libs/utils/date.ts'
import { EmptyState, ErrorAlert, Field, a11yProps } from '@/presentation/components/index.ts'
import { Badge } from '@/presentation/components/ui/badge.tsx'
import { Button } from '@/presentation/components/ui/button.tsx'
import { Textarea } from '@/presentation/components/ui/textarea.tsx'
import { useAction } from '@/presentation/hooks/use-action.ts'
import { initials } from '@/presentation/modules/auth/components/AccountMenu.tsx'
import type { PanelProps } from '@/presentation/types/project-panels.ts'

const roleOf = (project: ProjectDetail, author: UserRef) =>
  author.id === project.coordinator.id ? 'Điều phối' : author.id === project.treasurer?.id ? 'Tài chính' : null

/** Bảng tin tiến độ kiểu "Kabar terbaru" (Kitabisa): nhóm dự án kể lại đã làm gì, người góp sức theo dõi ở một chỗ. */
export function UpdatesFeed({ project, user, mode, onChanged }: PanelProps) {
  const canPost =
    !!user && (user.id === project.coordinator.id || user.id === project.treasurer?.id) && PUBLIC_PROJECT_STATUSES.includes(project.status)

  return (
    <div className="space-y-4">
      {canPost && <Composer projectId={project.id} mode={mode} onChanged={onChanged} />}
      {project.updates.length === 0 ? (
        <EmptyState title="Chưa có tin cập nhật">
          <p>Nhóm dự án sẽ đăng tiến độ ở đây: đã mua gì, đã trao cho ai, khi nào cần thêm người.</p>
        </EmptyState>
      ) : (
        <ol aria-label="Bảng tin dự án" className="space-y-3">
          {project.updates.map((u) => {
            const role = roleOf(project, u.author)
            return (
              <li key={u.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-semibold text-primary"
                  >
                    {initials(u.author.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
                      <Link href={`/u/${u.author.id}`} className="underline-offset-4 hover:text-primary hover:underline">
                        {u.author.name}
                      </Link>
                      {role && (
                        <Badge variant="outline" className="font-normal text-muted-foreground">
                          {role}
                        </Badge>
                      )}
                    </p>
                    <time dateTime={u.createdAt} className="text-xs text-muted-foreground">
                      {formatTime(u.createdAt)}
                    </time>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-pretty whitespace-pre-line">{u.body}</p>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function Composer({ projectId, mode, onChanged }: Pick<PanelProps, 'mode' | 'onChanged'> & { projectId: string }) {
  const [body, setBody] = useState('')
  const [fieldError, setFieldError] = useState<string>()
  const { busy, error, run } = useAction()
  const length = body.trim().length

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (length < MIN_UPDATE_LENGTH) return setFieldError(`Viết thêm ${MIN_UPDATE_LENGTH - length} ký tự nữa.`)
    setFieldError(undefined)
    run(
      () => postUpdate(projectId, { body: body.trim() }, mode),
      () => {
        setBody('')
        toast.success('Đã đăng tin. Người theo dõi dự án sẽ thấy ngay.')
        return onChanged()
      },
    )
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-xl border border-dashed bg-card p-4">
      <ErrorAlert error={error} />
      <Field id="update-body" label="Đăng tin cập nhật" hint="Đã làm được gì, sắp làm gì, đang cần thêm gì." error={fieldError}>
        <Textarea
          {...a11yProps('update-body', fieldError, true)}
          rows={3}
          maxLength={2000}
          placeholder="Ví dụ: Đã mua đủ gạo và thịt, sáng Thứ Bảy nấu ở bếp mái ấm. Cần thêm 3 bạn phụ chia phần lúc 10h."
          className="min-h-20 text-base"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Megaphone className="size-3.5" aria-hidden="true" />
          Tin hiện công khai trên trang dự án
        </span>
        <Button type="submit" size="lg" disabled={busy}>
          <Send aria-hidden="true" />
          {busy ? 'Đang đăng…' : 'Đăng tin'}
        </Button>
      </div>
    </form>
  )
}
