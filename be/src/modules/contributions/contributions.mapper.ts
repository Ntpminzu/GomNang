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
export const toContributionRow = (c: typeof contributions.$inferSelect): ContributionRow => ({
  id: c.id,
  projectId: c.projectId,
  needItemId: c.needItemId,
  contributorId: c.contributorId,
  quantity: c.quantity,
  status: c.status,
  createdAt: iso(c.createdAt),
})
