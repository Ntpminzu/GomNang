'use client'

import { useState } from 'react'
import { CheckCircle2, ReceiptText, X } from 'lucide-react'
import { toast } from 'sonner'
import { RECEIPT_MAX_BYTES, RECEIPT_TYPES } from '@gomnang/domain/files.ts'
import { MIN_EXPENSE_DESCRIPTION_LENGTH } from '@gomnang/domain/rules.ts'
import type { FileMeta } from '@gomnang/domain/types.ts'
import type { LedgerLine } from '@gomnang/domain/views.ts'
import { recordExpense, toApiError, uploadReceipt, type DemoMode } from '@/libs/api/index.ts'
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
import { fileSize } from './ReceiptPreview.tsx'

type Errors = Partial<Record<'amount' | 'description', string>>

/** Ảnh chụp điện thoại thường 3–6 MB: thu nhỏ cạnh dài về 1600 px và nén JPEG cho vừa giới hạn. */
async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Không đọc được ảnh này. Hãy chọn ảnh khác.'))), 'image/jpeg', 0.85),
  )
}

/** Người phụ trách tài chính ghi một khoản chi. Kiểm sớm cho nhanh; máy chủ kiểm lại bằng canRecordExpense. */
export function ExpenseDialog({ projectId, lines, mode, onDone }: { projectId: string; lines: LedgerLine[]; mode: DemoMode; onDone: () => unknown }) {
  const [open, setOpen] = useState(false)
  const [lineId, setLineId] = useState(lines[0]?.needItemId ?? '')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [receipt, setReceipt] = useState<FileMeta | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string>()
  // Ô chọn file không điều khiển được giá trị: đổi key để xoá lựa chọn cũ.
  const [fileInputKey, setFileInputKey] = useState(0)
  const [errors, setErrors] = useState<Errors>({})
  const { busy, error, run, clear } = useAction()
  const line = lines.find((l) => l.needItemId === lineId) ?? lines[0]
  const available = line ? line.balance - line.pending : 0

  async function pick(file: File | undefined) {
    setReceipt(null)
    setUploadError(undefined)
    if (!file) return
    if (!(RECEIPT_TYPES as readonly string[]).includes(file.type)) return setUploadError('Chỉ nhận ảnh JPG, PNG, WebP hoặc file PDF.')
    setUploading(true)
    try {
      const shrink = file.size > RECEIPT_MAX_BYTES && file.type !== 'application/pdf'
      const blob = shrink ? await shrinkImage(file) : file
      if (blob.size > RECEIPT_MAX_BYTES) throw new Error('File vượt quá 3 MB. Hãy nén file PDF hoặc chụp lại ảnh.')
      setReceipt(await uploadReceipt(projectId, blob, shrink ? file.name.replace(/\.[^.]+$/, '') + '.jpg' : file.name, mode))
    } catch (err) {
      setUploadError(toApiError(err).message)
      setFileInputKey((k) => k + 1)
    } finally {
      setUploading(false)
    }
  }

  function removeReceipt() {
    setReceipt(null)
    setUploadError(undefined)
    setFileInputKey((k) => k + 1)
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const value = amount.trim() === '' ? Number.NaN : Number(amount)
    const next: Errors = {}
    if (!Number.isInteger(value) || value <= 0) next.amount = 'Nhập số nguyên lớn hơn 0.'
    else if (value > available) next.amount = `Quỹ này chỉ còn ${available.toLocaleString('vi-VN')} ${line.unit}.`
    if (description.trim().length < MIN_EXPENSE_DESCRIPTION_LENGTH) next.description = `Ghi rõ đã chi cho việc gì (ít nhất ${MIN_EXPENSE_DESCRIPTION_LENGTH} ký tự).`
    setErrors(next)
    if (Object.keys(next).length > 0) return
    run(
      () =>
        recordExpense(
          projectId,
          { needItemId: line.needItemId, amount: value, description: description.trim(), receiptFileId: receipt?.id },
          mode,
        ),
      async () => {
        toast.success('Đã ghi khoản chi. Người điều phối sẽ duyệt để trừ vào số dư.')
        await onDone()
        setOpen(false)
        setAmount('')
        setDescription('')
        removeReceipt()
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
          setErrors({})
          setUploadError(undefined)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg">
          <ReceiptText aria-hidden="true" />
          Ghi khoản chi
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate className="min-w-0 space-y-4">
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
            label="Ảnh hoặc PDF chứng từ"
            hint="Không bắt buộc nhưng nên có. Ảnh JPG, PNG, WebP hoặc PDF, tối đa 3 MB; ảnh lớn được tự thu nhỏ. Khoản chi được duyệt thì ai cũng xem được chứng từ: hãy che số tài khoản, số điện thoại trước khi tải."
            error={uploadError}
          >
            <Input
              key={fileInputKey}
              {...a11yProps('expense-receipt', uploadError, true)}
              type="file"
              accept={RECEIPT_TYPES.join(',')}
              className="h-11 cursor-pointer text-base file:mr-3 file:cursor-pointer"
              disabled={uploading || busy}
              onChange={(e) => pick(e.target.files?.[0])}
            />
          </Field>
          {uploading && (
            <p className="text-sm text-muted-foreground" role="status">
              Đang tải chứng từ lên…
            </p>
          )}
          {receipt && (
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm" role="status">
              <span className="flex min-w-0 items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
                <span className="min-w-0 truncate" title={receipt.name}>
                  Đã tải: {receipt.name} · {fileSize(receipt.size)}
                </span>
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={removeReceipt}>
                <X aria-hidden="true" />
                Bỏ
              </Button>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Quay lại
              </Button>
            </DialogClose>
            <Button type="submit" size="lg" disabled={busy || uploading}>
              {busy ? 'Đang ghi…' : 'Ghi khoản chi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
