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
export const toAssessmentRow = (a: typeof assessments.$inferSelect): AssessmentRow => ({
  id: a.id,
  projectId: a.projectId,
  source: a.source,
  verdict: a.verdict,
  signals: a.signals,
  similarProjects: a.similarProjects,
  createdAt: iso(a.createdAt),
})
