import { DEMO_MODES, type ApiError, type DemoMode } from '@/lib/api.ts'
import { STATUS_LABEL, VERDICT_LABEL, type NeedItem, type ProjectStatus, type Verdict } from '@gomnang/domain/types.ts'

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <span className={`badge verdict-${verdict}`}>{VERDICT_LABEL[verdict]}</span>
}

/** Giờ Việt Nam, dạng ngắn. Chỉ gọi trong component đã chạy trên trình duyệt. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })
}

/**
 * Thanh tiến độ hai lớp: phần đã bàn giao nằm trong phần đã cam kết.
 * Cam kết mà chưa bàn giao thì chưa tính là xong — đúng theo chuỗi trạng thái
 * đóng góp trong đặc tả (đề xuất → cam kết → bàn giao → xác nhận).
 */
export function NeedProgress({ need }: { need: NeedItem }) {
  const pct = (n: number) => Math.min(100, Math.round((n / need.targetQty) * 100))
  const delivered = pct(need.deliveredQty)
  const committedOnly = Math.max(0, pct(need.committedQty) - delivered)
  const missing = Math.max(0, need.targetQty - need.committedQty)

  return (
    <div className="need">
      <div className="need-head">
        <span>{need.label}</span>
        <span className="qty">
          {need.deliveredQty}/{need.targetQty} {need.unit}
        </span>
      </div>
      <div
        className="bar"
        role="progressbar"
        aria-valuenow={need.deliveredQty}
        aria-valuemin={0}
        aria-valuemax={need.targetQty}
        aria-label={`${need.label}: đã bàn giao ${need.deliveredQty} trên ${need.targetQty} ${need.unit}`}
      >
        <div className="bar-delivered" style={{ width: `${delivered}%` }} />
        <div className="bar-committed" style={{ width: `${committedOnly}%` }} />
      </div>
      <p className="need-legend">
        {missing > 0 ? (
          <>
            còn thiếu <strong>{missing}</strong> {need.unit}
          </>
        ) : (
          <>đã đủ cam kết</>
        )}
        {' · '}đã cam kết {need.committedQty}
        {' · '}đã xác nhận {need.confirmedQty}
      </p>
    </div>
  )
}

export function ProgressLegend() {
  return (
    <p className="legend-row">
      <span>
        <i style={{ background: 'var(--ok)' }} />
        đã bàn giao
      </span>
      <span>
        <i style={{ background: 'var(--accent)', opacity: 0.55 }} />
        đã cam kết, chưa bàn giao
      </span>
      <span>
        <i style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }} />
        còn thiếu
      </span>
    </p>
  )
}

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

/**
 * Hiện lỗi khi tải trang theo đúng loại lỗi. Chỉ lỗi máy chủ mới có nút "Thử lại" —
 * thiếu quyền hay không tồn tại thì bấm lại bao nhiêu lần cũng vậy.
 */
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

/** Lỗi của một thao tác ghi (gửi form, bấm nút). Kèm mã HTTP để dễ giải thích khi bảo vệ. */
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

/**
 * Bộ chuyển chế độ demo — chỉ để trình bày đủ các trạng thái trên lớp mà không phải ngắt mạng.
 * Dùng thẻ <a> thường thay vì <Link> để trang tải lại hẳn, nhờ đó hiệu ứng tải chạy lại từ đầu.
 * Gỡ khỏi bản deploy ở Homework 4B.
 */
export function DemoSwitch({ mode, basePath }: { mode: DemoMode; basePath: string }) {
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
        {label}
        {required && (
          <span className="req" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {hint && (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p className="error-text" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
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
