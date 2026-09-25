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
export async function getVerificationQueue(mode: DemoMode = 'normal'): Promise<QueueItem[]> {
  await network(mode)
  const store = readStore()
  const user = requireUser(store)
  if (!user.isVerifier) {
    throw new ApiError(403, 'NOT_VERIFIER', 'Chỉ người xác minh mới xem được hàng chờ xác minh.')
  }
  if (mode === 'empty') return []

  const users = usersMap(store)
  return store.projects
    .filter((p) => p.status === 'pending_verification')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((p) => ({
      ...toSummary(p, store.needs, store.contributions),
      coordinator: userRef(users, p.coordinatorId),
      latestAssessment: latestAssessment(store.assessments, p.id),
    }))
}

export async function submitProject(id: string, mode: DemoMode = 'normal'): Promise<ProjectDetail> {
  await network(mode === 'empty' ? 'normal' : mode)
  const store = readStore()
  const user = requireUser(store)
  const project = findVisibleProject(store, id, user)
  ensure(canSubmitProject(project, user))

  const input: ProjectInput = {
    ...content(project),
    needItems: store.needs
      .filter((n) => n.projectId === id)
      .sort((a, b) => a.position - b.position)
      .map(({ label, unit, kind, targetQty }) => ({ label, unit, kind, targetQty })),
  }
  checkProjectRules(store, input, project.coordinatorId)

  const others = store.projects.filter((p) => p.id !== id && ACTIVE_STATUSES.includes(p.status))
  store.assessments.push({ id: crypto.randomUUID(), projectId: id, source: 'rules', ...assessProject(input, others), createdAt: now() })
  project.status = 'pending_verification'
  project.rejectionReason = null
  appendAudit(store, {
    projectId: id,
    entityType: 'project',
    entityId: id,
    fromState: 'draft',
    toState: 'pending_verification',
    actorId: user.id,
    reason: null,
  })
  writeStore(store)
  return detailOf(store, project)
}

export async function reviewProject(id: string, input: ReviewInput, mode: DemoMode = 'normal'): Promise<ProjectDetail> {
  await network(mode === 'empty' ? 'normal' : mode)
  const store = readStore()
  const user = requireUser(store)
  const project = findVisibleProject(store, id, user)
  ensure(canReviewProject(project, user, input))

  const next: ProjectStatus = input.decision === 'approve' ? 'published' : 'draft'
  const reason = input.reason?.trim() || null
  project.status = next
  project.rejectionReason = input.decision === 'reject' ? reason : null
  appendAudit(store, {
    projectId: id,
    entityType: 'project',
    entityId: id,
    fromState: 'pending_verification',
    toState: next,
    actorId: user.id,
    reason,
  })
  writeStore(store)
  return detailOf(store, project)
}
