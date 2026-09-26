import type { AssessmentResult } from '@gomnang/domain/assess.ts'
import type {
  AssessmentRow,
  AuditRow,
  ContributionRow,
  ContributionStatus,
  NeedItem,
  NeedRow,
  ProjectDetail,
  ProjectInput,
  ProjectRow,
  ProjectStatus,
  ProjectSummary,
  QueueItem,
  UserRow,
} from '@gomnang/domain/types.ts'
import { assessments, auditLog, contributions, needItems, projects, users } from '../../infrastructure/database/schema.ts'
const iso = (value: Date) => value.toISOString()
export const toProjectRow = (p: typeof projects.$inferSelect): ProjectRow => ({
  id: p.id,
  name: p.name,
  goal: p.goal,
  beneficiaryGroup: p.beneficiaryGroup,
  location: p.location,
  startDate: p.startDate,
  endDate: p.endDate,
  status: p.status,
  coordinatorId: p.coordinatorId,
  treasurerId: p.treasurerId,
  rejectionReason: p.rejectionReason,
  report: p.report,
  createdAt: iso(p.createdAt),
})
export const toNeedRow = (n: typeof needItems.$inferSelect): NeedRow => ({
  id: n.id,
  projectId: n.projectId,
  label: n.label,
  unit: n.unit,
  kind: n.kind,
  targetQty: n.targetQty,
  position: n.position,
})
