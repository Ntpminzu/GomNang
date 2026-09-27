'use client'

import { useState } from 'react'
import { HandHeart } from 'lucide-react'
import { toast } from 'sonner'
import type { NeedItem } from '@gomnang/domain/types.ts'
import { commitContribution, type DemoMode } from '@/libs/api/index.ts'
import { ErrorAlert, Field, a11yProps } from '@/presentation/components/index.ts'
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
import { Input } from '@/presentation/components/ui/input.tsx'
import { useAction } from '@/presentation/hooks/use-action.ts'

/** Gợi ý số lượng: toàn bộ phần còn thiếu, một nửa, một phần tư — bấm là điền, khỏi gõ. */
const quickAmounts = (remaining: number) => [...new Set([remaining, Math.ceil(remaining / 2), Math.ceil(remaining / 4)])].filter((n) => n > 0)
/** Ca tình nguyện: thường đăng ký cho mình hoặc thêm vài người đi cùng. */
const shiftAmounts = (remaining: number) => [1, 2, 3].filter((n) => n <= remaining)

export function CommitDialog({
  projectId,
  need,
  mode,
  onDone,
  children,
}: {
  projectId: string
  need: NeedItem
  mode: DemoMode
  onDone: () => unknown
  /** Nút mở hộp thoại. */
  children: React.ReactNode
}) {
  const remaining = Math.max(0, need.targetQty - need.committedQty)
  const [open, setOpen] = useState(false)
  const [quantity, setQuantity] = useState('')
  const [fieldError, setFieldError] = useState<string>()
  const { busy, error, run, clear } = useAction()
  const id = `commit-qty-${need.id}`

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const amount = quantity.trim() === '' ? Number.NaN : Number(quantity)
    // Kiểm sớm cho nhanh; máy chủ vẫn kiểm lại đúng quy tắc canCommit trước khi ghi.
    if (!Number.isInteger(amount) || amount <= 0) return setFieldError('Nhập số nguyên lớn hơn 0.')
    if (amount > remaining) return setFieldError(`Chỉ còn thiếu ${remaining} ${need.unit}.`)
    setFieldError(undefined)
    run(
      () => commitContribution(projectId, { needItemId: need.id, quantity: amount }, mode),
      async () => {
        toast.success(`Cảm ơn bạn! Đã ghi nhận cam kết ${amount} ${need.unit} ${need.label}.`, {
          description: 'Khi bàn giao xong, bấm "Đã bàn giao" ở tab Đóng góp để người điều phối xác nhận.',
        })
        await onDone()
        setOpen(false)
        setQuantity('')
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          clear()
          setFieldError(undefined)
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandHeart className="size-5 text-cta" aria-hidden="true" />
              {need.shift ? 'Đăng ký ca' : 'Nhận góp'}: {need.label}
            </DialogTitle>
            <DialogDescription>
              Còn thiếu <strong className="text-foreground tabular-nums">{remaining}</strong> {need.unit}. Bạn nhận lo bao nhiêu thì
              ghi bấy nhiêu — không cần nhận hết.
            </DialogDescription>
          </DialogHeader>
          <ErrorAlert error={error} />
          <Field id={id} label={`Số lượng (${need.unit})`} required error={fieldError}>
            <Input
              {...a11yProps(id, fieldError)}
              type="number"
              inputMode="numeric"
              min={1}
              max={remaining}
              className="h-11 text-base"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              autoFocus
            />
          </Field>
          <div role="group" aria-label="Chọn nhanh số lượng" className="flex flex-wrap gap-2">
            {(need.shift ? shiftAmounts(remaining) : quickAmounts(remaining)).map((n) => (
              <Button key={n} type="button" variant="outline" size="sm" onClick={() => setQuantity(String(n))}>
                {n === remaining ? `Tất cả (${n})` : n}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Huỷ
              </Button>
            </DialogClose>
            <Button type="submit" variant="cta" size="lg" disabled={busy}>
              {busy ? 'Đang ghi nhận…' : 'Xác nhận cam kết'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
