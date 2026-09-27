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
  type TransitionInput,
  type UserRow,
} from '@gomnang/domain/types.ts'
import { todayInVietnam, validateProject } from '@gomnang/domain/validate-project.ts'
import { latestAssessment, toDetail, toMember, toNeedItems, toSummary, userRef } from '@gomnang/domain/views.ts'
import { getSessionUser } from './session.ts'


import { ApiError } from '../errors.ts'
import type { DemoMode } from '../demo.ts'
import { STORE_KEY, settings, configureMock, seedStore, readStore, writeStore, resetMockData, network, today, now, ACTIVE_STATUSES, STATUS_BY_KIND, ensure, projectNotFound, currentUser, requireUser, usersMap, detailOf, findVisibleProject, appendAudit, normalizeInput, content, checkProjectRules, replaceNeeds } from './store.ts'
export async function commitContribution(
  projectId: string,
  input: CommitInput,
  mode: DemoMode = 'normal',
): Promise<Contribution> {
  await network(mode === 'empty' ? 'normal' : mode)
  const store = readStore()
  const user = requireUser(store)
  const project = findVisibleProject(store, projectId, user)

  const need = store.needs.find((n) => n.id === input.needItemId && n.projectId === projectId)
  if (!need) throw new ApiError(404, 'NEED_NOT_FOUND', 'Không tìm thấy hạng mục nhu cầu này trong dự án.')
  const [totals] = toNeedItems([need], store.contributions)
  ensure(canCommit(project, totals, input.quantity, user))

  const row: ContributionRow = {
    id: crypto.randomUUID(),
    projectId,
    needItemId: need.id,
    contributorId: user.id,
    quantity: input.quantity,
    status: 'committed',
    createdAt: now(),
  }
  store.contributions.push(row)
  appendAudit(store, {
    projectId,
    entityType: 'contribution',
    entityId: row.id,
    fromState: null,
    toState: 'committed',
    actorId: user.id,
    reason: null,
  })
  writeStore(store)
  return detailOf(store, project).contributions.find((c) => c.id === row.id)!
}

export async function transitionContribution(
  id: string,
  input: TransitionInput,
  mode: DemoMode = 'normal',
): Promise<Contribution> {
  const { to } = input
  await network(mode === 'empty' ? 'normal' : mode)
  const store = readStore()
  const user = requireUser(store)

  const contribution = store.contributions.find((c) => c.id === id)
  const project = contribution && store.projects.find((p) => p.id === contribution.projectId)
  const need = contribution && store.needs.find((n) => n.id === contribution.needItemId)
  if (!contribution || !project || !need) {
    throw new ApiError(404, 'CONTRIBUTION_NOT_FOUND', 'Không tìm thấy đóng góp.')
  }
  ensure(canTransitionContribution(contribution, to, project, need.kind, user))

  const from = contribution.status
  contribution.status = to
  appendAudit(store, {
    projectId: project.id,
    entityType: 'contribution',
    entityId: id,
    fromState: from,
    toState: to,
    actorId: user.id,
    reason: input.note?.trim() || null,
  })
  writeStore(store)
  return detailOf(store, project).contributions.find((c) => c.id === id)!
}
