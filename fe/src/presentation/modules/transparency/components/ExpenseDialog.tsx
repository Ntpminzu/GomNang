'use client'

import { useState } from 'react'
import { ReceiptText } from 'lucide-react'
import { toast } from 'sonner'
import { MIN_EXPENSE_DESCRIPTION_LENGTH } from '@gomnang/domain/rules.ts'
import type { LedgerLine } from '@gomnang/domain/views.ts'
import { recordExpense, type DemoMode } from '@/libs/api/index.ts'
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
import { NativeSelect, NativeSelectOption } from '@/presentation/components/ui/native-select.tsx'
import { Textarea } from '@/presentation/components/ui/textarea.tsx'
import { useAction } from '@/presentation/hooks/use-action.ts'

type Errors = Partial<Record<'amount' | 'description' | 'receiptUrl', string>>

/** Người phụ trách tài chính ghi một khoản chi. Kiểm sớm cho nhanh; máy chủ kiểm lại bằng canRecordExpense. */
export function ExpenseDialog({ projectId, lines, mode, onDone }: { projectId: string; lines: LedgerLine[]; mode: DemoMode; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [lineId, setLineId] = useState(lines[0]?.needItemId ?? '')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [receiptUrl, setReceiptUrl] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const { busy, error, run } = useAction()
  const line = lines.find((l) => l.needItemId === lineId) ?? lines[0]
  const available = line ? line.balance - line.pending : 0

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const value = amount.trim() === '' ? Number.NaN : Number(amount)
    const next: Errors = {}
    if (!Number.isInteger(value) || value <= 0) next.amount = 'Nhập số nguyên lớn hơn 0.'
    else if (value > available) next.amount = `Quỹ này chỉ còn ${available.toLocaleString('vi-VN')} ${line.unit}.`
    if (description.trim().length < MIN_EXPENSE_DESCRIPTION_LENGTH) next.description = `Ghi rõ đã chi cho việc gì (ít nhất ${MIN_EXPENSE_DESCRIPTION_LENGTH} ký tự).`
    if (receiptUrl.trim() && !/^https?:\/\/\S+$/.test(receiptUrl.trim())) next.receiptUrl = 'Link phải bắt đầu bằng http:// hoặc https://.'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    run(
      () =>
        recordExpense(
          projectId,
          { needItemId: line.needItemId, amount: value, description: description.trim(), receiptUrl: receiptUrl.trim() || undefined },
          mode,
        ),
      () => {
        setOpen(false)
        setAmount('')
        setDescription('')
        setReceiptUrl('')
        toast.success('Đã ghi khoản chi. Người điều phối sẽ duyệt để trừ vào số dư.')
        onDone()
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <ReceiptText aria-hidden="true" />
          Ghi khoản chi
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>Ghi khoản chi</DialogTitle>
            <DialogDescription>
              Khoản chi hiện công khai ngay với trạng thái “Chờ duyệt”, chỉ trừ vào số dư sau khi người điều phối duyệt.
            </DialogDescription>
          </DialogHeader>
          <ErrorAlert error={error} />
          {lines.length > 1 && (
            <Field id="expense-line" label="Chi từ quỹ" required>
              <NativeSelect id="expense-line" className="h-11 w-full" value={line?.needItemId} onChange={(e) => setLineId(e.target.value)}>
                {lines.map((l) => (
                  <NativeSelectOption key={l.needItemId} value={l.needItemId}>
                    {l.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          )}
          <Field
            id="expense-amount"
            label={`Số tiền (${line?.unit ?? ''})`}
            required
            hint={`Quỹ “${line?.label}” còn chi được ${available.toLocaleString('vi-VN')} ${line?.unit}.`}
            error={errors.amount}
          >
            <Input
              {...a11yProps('expense-amount', errors.amount, true)}
              type="number"
              inputMode="numeric"
              min={1}
              max={available}
              className="h-11 text-base"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </Field>
          <Field id="expense-description" label="Chi cho việc gì" required error={errors.description}>
            <Textarea
              {...a11yProps('expense-description', errors.description)}
              rows={2}
              maxLength={500}
              placeholder="Ví dụ: Mua 2 bình gas 12kg ở đại lý Linh Trung"
              className="min-h-16 text-base"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field
            id="expense-receipt"
            label="Link ảnh hoá đơn"
            hint="Không bắt buộc nhưng nên có: link ảnh trên Google Drive, Zalo, Facebook…"
            error={errors.receiptUrl}
          >
            <Input
              {...a11yProps('expense-receipt', errors.receiptUrl, true)}
              type="url"
              inputMode="url"
              placeholder="https://"
              className="h-11 text-base"
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Quay lại
              </Button>
            </DialogClose>
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? 'Đang ghi…' : 'Ghi khoản chi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
