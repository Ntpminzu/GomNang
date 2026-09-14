import { assessProject } from '@gomnang/domain/assess.ts'
import {
  DEMO_ASSESSMENTS,
  DEMO_AUDIT,
  DEMO_CONTRIBUTIONS,
  DEMO_NEEDS,
  DEMO_PROJECTS,
  DEMO_USERS,
} from '@gomnang/domain/demo-data.ts'
import {
  canCommit,
  canEditProject,
  canReviewProject,
  canSubmitProject,
  canTransitionContribution,
  canViewProject,
  type RuleResult,
} from '@gomnang/domain/rules.ts'
import {
  PUBLIC_PROJECT_STATUSES,
  type AssessmentRow,
  type AuditRow,
  type CommitInput,
  type Contribution,
  type ContributionRow,
  type Member,
  type NeedRow,
  type ProjectDetail,
  type ProjectInput,
  type ProjectRow,
  type ProjectStatus,
  type ProjectSummary,
  type QueueItem,
  type ReviewInput,
  type TransitionTarget,
  type UserRow,
} from '@gomnang/domain/types.ts'
import { todayInVietnam, validateProject } from '@gomnang/domain/validate-project.ts'
import { latestAssessment, toDetail, toMember, toNeedItems, toSummary, userRef } from '@gomnang/domain/views.ts'
import { getSessionUser } from './session.ts'


import { ApiError } from '../errors.ts'
import type { DemoMode } from '../demo.ts'
import { STORE_KEY, settings, configureMock, seedStore, readStore, writeStore, resetMockData, network, today, now, ACTIVE_STATUSES, STATUS_BY_KIND, ensure, projectNotFound, currentUser, requireUser, usersMap, detailOf, findVisibleProject, appendAudit, normalizeInput, content, checkProjectRules, replaceNeeds } from './store.ts'
export async function listMembers(mode: DemoMode = 'normal'): Promise<Member[]> {
  await network(mode === 'empty' ? 'normal' : mode)
  const store = readStore()
  requireUser(store)
  return [...store.users].sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi')).map(toMember)
}
