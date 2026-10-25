'use client'

import { useEffect, useState } from 'react'
import { Download, Paperclip } from 'lucide-react'
import type { FileMeta } from '@gomnang/domain/types.ts'
import { getFile, type DemoMode } from '@/libs/api/index.ts'
import { ErrorAlert, linkClass } from '@/presentation/components/index.ts'
import { Button } from '@/presentation/components/ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/components/ui/dialog.tsx'
import { useAction } from '@/presentation/hooks/use-action.ts'
import { cn } from '@/libs/utils/cn.ts'

export const fileSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`)

/**
 * Xem chứng từ ngay trong trang. File lấy qua API kèm phiên đăng nhập (không mở thẳng link được vì token không nằm trong cookie),
 * nên tải về thành blob rồi hiện ảnh hoặc PDF; máy chủ trả 404 nếu người xem không có quyền.
 */
export function ReceiptPreview({ file, mode }: { file: FileMeta; mode: DemoMode }) {
  const [url, setUrl] = useState<string | null>(null)
  const { busy, error, run, clear } = useAction()

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) return clear()
        if (!url) run(async () => setUrl(URL.createObjectURL(await getFile(file.id, mode))), () => undefined)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="link" className="h-auto min-h-6 gap-1 p-0 text-xs">
          <Paperclip className="size-3" aria-hidden="true" />
          Xem chứng từ
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="break-all">Chứng từ: {file.name}</DialogTitle>
          <DialogDescription>
            {file.mime === 'application/pdf' ? 'File PDF' : 'Ảnh'} · {fileSize(file.size)}
          </DialogDescription>
        </DialogHeader>
        <ErrorAlert error={error} />
        {busy && (
          <p className="text-sm text-muted-foreground" role="status">
            Đang tải chứng từ…
          </p>
        )}
        {url &&
          (file.mime === 'application/pdf' ? (
            <iframe title={`Chứng từ ${file.name}`} src={url} className="h-[65dvh] w-full rounded-lg border" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- blob URL tạo tại chỗ, next/image không tối ưu được
            <img src={url} alt={`Chứng từ ${file.name}`} className="max-h-[65dvh] w-full rounded-lg border object-contain" />
          ))}
        {url && (
          <a href={url} download={file.name} className={cn(linkClass, 'inline-flex items-center gap-1 text-sm')}>
            <Download className="size-4" aria-hidden="true" />
            Tải về máy
          </a>
        )}
      </DialogContent>
    </Dialog>
  )
}
