import Link from 'next/link'
import { AlertCircle, ArrowLeft, Inbox, RotateCw } from 'lucide-react'
import { DEMO_MODES, type ApiError, type DemoMode } from '../../libs/api/index.ts'
import { isMockMode } from '../../libs/config/env.ts'
import { cn } from '../../libs/utils/cn.ts'
import { Alert, AlertDescription, AlertTitle } from './ui/alert.tsx'
import { Button } from './ui/button.tsx'
import { Card, CardContent } from './ui/card.tsx'
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from './ui/empty.tsx'
import { Field as FieldRoot, FieldDescription, FieldError, FieldLabel } from './ui/field.tsx'
import { Skeleton } from './ui/skeleton.tsx'

/*
 * Khối giao diện dùng chung của GOM NẮNG, dựng trên shadcn/ui trong ./ui/ (code do CLI shadcn sinh, hạn chế sửa tay).
 * Quy ước riêng của dự án nằm ở file này: màu trạng thái, tiêu đề trang, khối thao tác, trạng thái tải / rỗng / lỗi, ô nhập.
 */

/** Màu nhãn trạng thái. Luôn đi kèm chữ — không dùng màu một mình để báo trạng thái. */
export const toneClass = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/12 text-primary',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/12 text-warning',
  danger: 'bg-destructive/10 text-destructive',
  sun: 'bg-sun/20 text-warning',
} as const
export type Tone = keyof typeof toneClass

export const linkClass = 'font-medium text-primary underline-offset-4 hover:underline'

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  /** Nút thao tác bên phải tiêu đề. */
  children?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-2">
        {eyebrow && <div className="text-sm font-medium text-primary">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h1>
        {description && <p className="max-w-2xl text-pretty text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function SectionHeading({
  id,
  children,
  description,
  action,
}: {
  id?: string
  children: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1">
        <h2 id={id} className="text-lg font-semibold tracking-tight">
          {children}
        </h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mb-5 inline-flex min-h-6 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {children}
    </Link>
  )
}

/** Khối thao tác theo vai trên trang dự án: viền trái màu nhấn để tách khỏi phần thông tin. */
export function Panel({
  title,
  titleId,
  aside,
  tone = 'primary',
  className,
  children,
}: {
  title: React.ReactNode
  titleId?: string
  aside?: React.ReactNode
  tone?: 'primary' | 'cta' | 'warning' | 'success'
  className?: string
  children: React.ReactNode
}) {
  const border = { primary: 'border-l-primary', cta: 'border-l-cta', warning: 'border-l-warning', success: 'border-l-success' }[tone]
  return (
    <section
      aria-labelledby={titleId}
      className={cn('rounded-xl border border-l-4 bg-card p-5 text-card-foreground shadow-xs', border, className)}
    >
      <h2 id={titleId} className="mb-2 flex flex-wrap items-center gap-2 text-base font-semibold">
        {title}
        {aside}
      </h2>
      {children}
    </section>
  )
}

export function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="gap-0 py-0">
          <Skeleton className="h-28 rounded-none" />
          <CardContent className="space-y-3 py-4">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="mt-4 h-2 w-full" />
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

export function EmptyState({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <Empty className="border bg-card/60">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon ?? <Inbox aria-hidden="true" />}</EmptyMedia>
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
          <AlertCircle aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle className="text-base text-destructive">
          <h3>Không tải được dữ liệu</h3>
        </EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <p className="text-muted-foreground">{message}</p>
        <Button variant="outline" onClick={onRetry}>
          <RotateCw aria-hidden="true" />
          Thử lại
        </Button>
      </EmptyContent>
    </Empty>
  )
}

/** Lỗi khi tải trang, theo đúng loại. Chỉ lỗi mạng / máy chủ mới có "Thử lại" — thiếu quyền hay không tồn tại thì bấm lại cũng vậy. */
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
        <p>
          {error.message}
          {error.code === 'PROJECT_NOT_FOUND' && ' Dự án có thể chưa được công khai, hoặc bạn không thuộc dự án này.'}
        </p>
      </EmptyState>
    )
  }
  return <ErrorState message={error.message} onRetry={onRetry} />
}

/** Lỗi của một thao tác ghi. Kèm mã lỗi để dễ giải thích khi bảo vệ đồ án. */
export function ErrorAlert({ error }: { error: ApiError | null }) {
  if (!error) return null
  const details = error.details ? Object.values(error.details) : []
  return (
    <Alert variant="destructive" className="my-3 border-destructive/40 bg-destructive/5">
      <AlertCircle aria-hidden="true" />
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
          HTTP {error.status} · {error.code}
        </p>
      </AlertDescription>
    </Alert>
  )
}

/** Chỉ hiện ở chế độ mock: xem thử các trạng thái bình thường / chậm / rỗng / lỗi mà không cần backend. */
export function DemoSwitch({ mode, basePath }: { mode: DemoMode; basePath: string }) {
  if (!isMockMode) return null
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Chế độ demo:</span>
      {DEMO_MODES.map((m) => (
        <a
          key={m.value}
          href={m.value === 'normal' ? basePath : `${basePath}?state=${m.value}`}
          aria-current={m.value === mode ? 'true' : undefined}
          className={cn(
            'rounded-full border px-3 py-1 transition-colors',
            m.value === mode ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
          )}
        >
          {m.label}
        </a>
      ))}
    </div>
  )
}

/** Một ô của form: nhãn, gợi ý, ô nhập, lỗi. id của gợi ý và lỗi khớp với a11yProps bên dưới. */
export function Field({
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
    <FieldRoot data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </FieldLabel>
      {/* Gợi ý và lỗi luôn nằm DƯỚI ô nhập: ô cùng hàng không bị đẩy lệch khi một ô có gợi ý hoặc báo lỗi. */}
      {children}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
    </FieldRoot>
  )
}

export function a11yProps(id: string, error?: string, hint?: boolean) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ')
  return {
    id,
    name: id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
  } as const
}
