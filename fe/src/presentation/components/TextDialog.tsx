'use client'

import { useState } from 'react'
import { toast } from 'sonner'
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
import { Textarea } from '@/presentation/components/ui/textarea.tsx'
import { useAction } from '@/presentation/hooks/use-action.ts'
import { ErrorAlert, Field, a11yProps } from './ui.tsx'

/**
 * Hộp thoại xác nhận kèm một ô chữ: lý do huỷ, báo cáo tổng kết, ghi chú bàn giao.
 * minLength = 0 nghĩa là ô chữ không bắt buộc. Máy chủ vẫn kiểm lại độ dài theo luật trong packages/domain.
 */
export function TextDialog({
  id,
  title,
  description,
  label,
  placeholder,
  minLength = 0,
  maxLength,
  rows = 3,
  submitLabel,
  variant = 'default',
  success,
  onSubmit,
  onDone,
  children,
}: {
  id: string
  title: React.ReactNode
  description?: React.ReactNode
  label: string
  placeholder?: string
  minLength?: number
  maxLength: number
  rows?: number
  submitLabel: string
  variant?: 'default' | 'cta' | 'destructive'
  success?: string
  onSubmit: (text: string) => Promise<unknown>
  onDone: () => unknown
  /** Nút mở hộp thoại. */
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [fieldError, setFieldError] = useState<string>()
  const { busy, error, run, clear } = useAction()
  const length = text.trim().length
  const hint = minLength > 0 ? `Tối thiểu ${minLength} ký tự · đã viết ${length}` : 'Không bắt buộc'

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (length < minLength) return setFieldError(`Viết thêm ${minLength - length} ký tự nữa.`)
    setFieldError(undefined)
    run(
      () => onSubmit(text.trim()),
      // Chỉ đóng hộp thoại khi dữ liệu mới đã về — nút phía sau không bị bấm lại trên trạng thái cũ.
      async () => {
        if (success) toast.success(success)
        await onDone()
        setOpen(false)
        setText('')
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        // Đóng rồi mở lại thì bắt đầu sạch, không còn lỗi của lần trước.
        if (!next) {
          clear()
          setFieldError(undefined)
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription asChild><div className="space-y-2">{description}</div></DialogDescription>}
          </DialogHeader>
          <ErrorAlert error={error} />
          <Field id={id} label={label} required={minLength > 0} hint={hint} error={fieldError}>
            <Textarea
              {...a11yProps(id, fieldError, true)}
              rows={rows}
              maxLength={maxLength}
              placeholder={placeholder}
              className="min-h-24 text-base"
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
            />
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Quay lại
              </Button>
            </DialogClose>
            <Button type="submit" variant={variant} size="lg" disabled={busy}>
              {busy ? 'Đang lưu…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
