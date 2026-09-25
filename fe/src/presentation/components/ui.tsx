import { DEMO_MODES, type ApiError, type DemoMode } from '../../libs/api/index.ts'
import { isMockMode } from '../../libs/config/env.ts'
export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="card" key={i}>
          <div className="skeleton" style={{ height: 18, width: '35%' }} />
          <div className="skeleton" style={{ height: 22, width: '85%', marginTop: 12 }} />
          <div className="skeleton" style={{ height: 14, width: '60%', marginTop: 10 }} />
          <div className="skeleton" style={{ height: 8, width: '100%', marginTop: 22 }} />
          <div className="skeleton" style={{ height: 8, width: '100%', marginTop: 14 }} />
        </div>
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
    <div className="state">
      <h3>{title}</h3>
      {children}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="state state-error" role="alert">
      <h3>Không tải được dữ liệu</h3>
      <p>{message}</p>
      <p style={{ marginTop: '1rem' }}>
        <button className="btn" onClick={onRetry}>
          Thử lại
        </button>
      </p>
    </div>
  )
}

export function ApiErrorState({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  if (error.status === 401) {
    return (
      <EmptyState title="Cần chọn tài khoản">
        <p>{error.message} Chọn một tài khoản mẫu ở góc trên bên phải.</p>
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

export function ErrorAlert({ error }: { error: ApiError | null }) {
  if (!error) return null
  const details = error.details ? Object.values(error.details) : []
  return (
    <div className="alert alert-error" role="alert">
      <strong>{error.message}</strong>
      {details.length > 0 && (
        <ul>
          {details.map((message, i) => (
            <li key={i}>{message}</li>
          ))}
        </ul>
      )}
      <p style={{ margin: '.35rem 0 0', fontSize: '.8rem', opacity: 0.85 }}>
        HTTP {error.status} · {error.code}
      </p>
    </div>
  )
}

export function DemoSwitch({ mode, basePath }: { mode: DemoMode; basePath: string }) {
  if (!isMockMode) return null
  return (
    <div className="demo-switch">
      <span>Chế độ demo:</span>
      {DEMO_MODES.map((m) => (
        <a
          key={m.value}
          href={m.value === 'normal' ? basePath : `${basePath}?state=${m.value}`}
          className={m.value === mode ? 'chip chip-active' : 'chip'}
          aria-current={m.value === mode ? 'true' : undefined}
        >
          {m.label}
        </a>
      ))}
    </div>
  )
}

export function Field({
  id,
  label,
  error,
  hint,
  required,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}{required && <span className="req" aria-hidden="true"> *</span>}
      </label>
      {hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
      {children}
      {error && <p className="error-text" id={`${id}-error`} role="alert">{error}</p>}
    </div>
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
