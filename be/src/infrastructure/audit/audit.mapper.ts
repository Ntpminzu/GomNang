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
import { assessments, auditLog, contributions, needItems, projects, users } from '../database/schema.ts'
const iso = (value: Date) => value.toISOString()
export const toAuditRow = (a: typeof auditLog.$inferSelect): AuditRow => ({
  id: a.id,
  projectId: a.projectId,
  entityType: a.entityType,
  entityId: a.entityId,
  fromState: a.fromState,
  toState: a.toState,
  actorId: a.actorId,
  reason: a.reason,
  at: iso(a.at),
})
