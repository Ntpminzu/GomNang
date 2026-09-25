import { STATUS_LABEL, VERDICT_LABEL, type NeedItem, type ProjectStatus, type Verdict } from '@gomnang/domain/types.ts'
export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <span className={`badge verdict-${verdict}`}>{VERDICT_LABEL[verdict]}</span>
}
