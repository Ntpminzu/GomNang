import { VERDICT_LABEL, type Verdict } from '@gomnang/domain/types.ts'
import { toneClass, type Tone } from '@/presentation/components/index.ts'
import { Badge } from '@/presentation/components/ui/badge.tsx'

const TONE: Record<Verdict, Tone> = { PASS: 'success', NEEDS_INFO: 'warning', FLAG: 'danger' }

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <Badge className={toneClass[TONE[verdict]]}>{VERDICT_LABEL[verdict]}</Badge>
}
