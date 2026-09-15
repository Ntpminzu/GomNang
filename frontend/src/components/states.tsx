import Link from 'next/link'
import { AlertCircle, ArrowLeft, Inbox, RotateCw } from 'lucide-react'
import type { ApiError } from '@/lib/api-client.ts'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/*
 * Khối giao diện dùng chung của GOM NẮNG, dựng trên component shadcn/ui trong components/ui/.
 * components/ui/ là code shadcn sinh ra — hạn chế sửa tay. Mọi quy ước riêng của dự án nằm ở file này.
 */

/** Màu nhãn trạng thái. Dùng chung cho trạng thái dự án, trạng thái đóng góp và kết quả người gác cổng. */
export const toneClass = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/12 text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-destructive/10 text-destructive',
} as const
export type Tone = keyof typeof toneClass

/** Link chữ trong nội dung (không phải nút). */
export const linkClass = 'font-medium text-primary underline-offset-4 hover:underline'

export function PageHeader({
  title,
  description,
  children,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  /** Nút thao tác bên phải tiêu đề. */
  children?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-1.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h1>
        {description && <p className="max-w-2xl text-pretty text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function SectionHeading({ children, description }: { children: React.ReactNode; description?: React.ReactNode }) {
  return (
    <div className="mt-10 mb-3 space-y-1">
      <h2 className="font-heading text-lg font-semibold tracking-tight">{children}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {children}
    </Link>
  )
}

/** Khối thao tác trên trang dự án (bản nháp, người gác cổng, duyệt, cam kết): viền trái màu nhấn để nổi khỏi phần thông tin. */
export function Panel({
  title,
  titleId,
  aside,
  className,
  children,
}: {
  title: React.ReactNode
  /** id của tiêu đề, để section có aria-labelledby. */
  titleId?: string
  /** Thứ nằm cạnh tiêu đề, ví dụ nhãn kết quả. */
  aside?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      aria-labelledby={titleId}
      className={cn('my-5 rounded-xl border border-l-4 border-l-primary bg-card p-5 text-card-foreground shadow-xs', className)}
    >
      <h2 id={titleId} className="mb-2 flex flex-wrap items-center gap-2 font-heading text-base font-semibold">
        {title}
        {aside}
      </h2>
      {children}
    </section>
  )
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <CardContent className="space-y-3">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="mt-5 h-2 w-full" />
            <Skeleton className="h-2 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function LoadingState({ label }: { label: string }) {
  return (
    <>
      <p className="sr-only" role="status">
        {label}
      </p>
      <SkeletonCards />
    </>
  )
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Empty className="border bg-card/60">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle className="text-base">
          <h3>{title}</h3>
        </EmptyTitle>
      </EmptyHeader>
      {children && <EmptyContent className="text-muted-foreground">{children}</EmptyContent>}
    </Empty>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Empty role="alert" className="border border-destructive/40 bg-destructive/5">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <AlertCircle />
        </EmptyMedia>
        <EmptyTitle className="text-base text-destructive">
          <h3>Không tải được dữ liệu</h3>
        </EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <p className="text-muted-foreground">{message}</p>
        <Button variant="outline" onClick={onRetry}>
          <RotateCw />
          Thử lại
        </Button>
      </EmptyContent>
    </Empty>
  )
}

/**
 * Hiện lỗi khi tải trang theo đúng loại lỗi. Chỉ lỗi mạng và lỗi máy chủ mới có nút "Thử lại" —
 * thiếu quyền hay không tồn tại thì bấm lại bao nhiêu lần cũng vậy.
 */
export function ApiErrorState({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  if (error.status === 401) {
    return (
      <EmptyState title="Cần đăng nhập">
        <p>{error.message}</p>
        <Button asChild>
          <Link href="/login">Đăng nhập</Link>
        </Button>
      </EmptyState>
    )
  }
  if (error.status === 403) {
    return (
      <EmptyState title="Không có quyền xem trang này">
        <p>{error.message}</p>
      </EmptyState>
    )
  }
  if (error.status === 404) {
    return (
      <EmptyState title="Không tìm thấy">
        <p>{error.message} Dự án có thể chưa được công khai, hoặc bạn không thuộc dự án này.</p>
      </EmptyState>
    )
  }
  return <ErrorState message={error.message} onRetry={onRetry} />
}

/** Lỗi của một thao tác ghi (gửi form, bấm nút). Kèm mã lỗi để dễ giải thích khi bảo vệ. */
export function ErrorAlert({ error }: { error: ApiError | null }) {
  if (!error) return null
  const details = error.details ? Object.values(error.details) : []
  return (
    <Alert variant="destructive" className="my-4 border-destructive/40 bg-destructive/5">
      <AlertCircle />
      <AlertTitle>{error.message}</AlertTitle>
      <AlertDescription>
        {details.length > 0 && (
          <ul className="mb-1 list-disc space-y-0.5 pl-4">
            {details.map((message, i) => (
              <li key={i}>{message}</li>
            ))}
          </ul>
        )}
        <p className="font-mono text-xs opacity-80">
          {error.status > 0 ? `HTTP ${error.status} · ` : ''}
          {error.code}
        </p>
      </AlertDescription>
    </Alert>
  )
}

/** Một ô của form: nhãn, gợi ý, ô nhập, lỗi. id của gợi ý và lỗi khớp với a11yProps bên dưới. */
export function FormField({
  id,
  label,
  error,
  hint,
  required,
  className,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </FieldLabel>
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
      {children}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  )
}

/** Gom các thuộc tính trợ năng cho một ô nhập, để không phải lặp ở từng trường. */
export function a11yProps(id: string, error?: string, hint?: boolean) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ')
  return {
    id,
    name: id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
  } as const
}
