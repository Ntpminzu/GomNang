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
export const toUserRow = (u: typeof users.$inferSelect): UserRow => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  phone: u.phone,
  identityVerified: u.identityVerified,
  role: u.role,
})
