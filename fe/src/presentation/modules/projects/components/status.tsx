import { STATUS_LABEL, VERDICT_LABEL, type NeedItem, type ProjectStatus, type Verdict } from '@gomnang/domain/types.ts'
export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
}

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
