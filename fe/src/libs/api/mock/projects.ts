import { assessProject } from '@gomnang/domain/assess.ts'
import { queryProjects, type ProjectListQuery, type ProjectPage } from '@gomnang/domain/catalog.ts'
import {
  DEMO_ASSESSMENTS,
  DEMO_AUDIT,
  DEMO_CONTRIBUTIONS,
  DEMO_NEEDS,
  DEMO_PROJECTS,
  DEMO_USERS,
} from '@gomnang/domain/demo-data.ts'
import {
  RELEASED_BY_CANCEL,
  canCancelProject,
  canCommit,
  canCompleteProject,
  canStartProject,
  canDeleteProject,
  canEditProject,
  canReviewProject,
  canSubmitProject,
  canTransitionContribution,
  canViewProject,
  type RuleResult,
} from '@gomnang/domain/rules.ts'
import {
  type AssessmentRow,
  type AuditRow,
  type CancelInput,
  type CompleteInput,
  type CommitInput,
  type Contribution,
  type ContributionRow,
  type ExpenseRow,
  type Member,
  type NeedRow,
  type ProjectDetail,
  type ProjectInput,
  type ProjectRow,
  type ProjectStatus,
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
export async function listProjects(query: ProjectListQuery = {}, mode: DemoMode = 'normal'): Promise<ProjectPage> {
  await network(mode)
  const store = readStore()
  const summaries = mode === 'empty' ? [] : store.projects.map((p) => toSummary(p, store.needs, store.contributions))
  return queryProjects(summaries, query, today())
}

export async function getProject(id: string, mode: DemoMode = 'normal'): Promise<ProjectDetail> {
  await network(mode)
  if (mode === 'empty') throw projectNotFound()
  const store = readStore()
  return detailOf(store, findVisibleProject(store, id, currentUser(store)))
}

export async function createProject(raw: ProjectInput, mode: DemoMode = 'normal'): Promise<ProjectDetail> {
  await network(mode === 'empty' ? 'normal' : mode)
  const store = readStore()
  const user = requireUser(store)
  const input = normalizeInput(raw)
  // Người điều phối luôn là người đang đăng nhập — giống backend.
  checkProjectRules(store, input, user.id)

  const project: ProjectRow = {
    id: crypto.randomUUID(),
    ...content(input),
    status: 'draft',
    coordinatorId: user.id,
    rejectionReason: null,
    report: null,
    createdAt: now(),
  }
  store.projects.push(project)
  replaceNeeds(store, project.id, input.needItems)
  appendAudit(store, {
    projectId: project.id,
    entityType: 'project',
    entityId: project.id,
    fromState: null,
    toState: 'draft',
    actorId: user.id,
    reason: null,
  })
  writeStore(store)
  return detailOf(store, project)
}

export async function updateProject(id: string, raw: ProjectInput, mode: DemoMode = 'normal'): Promise<ProjectDetail> {
  await network(mode === 'empty' ? 'normal' : mode)
  const store = readStore()
  const user = requireUser(store)
  const project = findVisibleProject(store, id, user)
  ensure(canEditProject(project, user))

  const input = normalizeInput(raw)
  checkProjectRules(store, input, project.coordinatorId)
  Object.assign(project, content(input))
  replaceNeeds(store, id, input.needItems)
  writeStore(store)
  return detailOf(store, project)
}

/** Giống backend: chỉ xoá bản nháp. Bản demo trong trình duyệt bỏ hẳn dự án khỏi kho (backend xoá mềm). */
export async function deleteProject(id: string, mode: DemoMode = 'normal'): Promise<void> {
  await network(mode === 'empty' ? 'normal' : mode)
  const store = readStore()
  const user = requireUser(store)
  ensure(canDeleteProject(findVisibleProject(store, id, user), user))
  store.projects = store.projects.filter((p) => p.id !== id)
  store.needs = store.needs.filter((n) => n.projectId !== id)
  store.assessments = store.assessments.filter((a) => a.projectId !== id)
  writeStore(store)
}

/** Giống changeStatus ở backend: kiểm luật, đổi trạng thái, ghi vết kèm lý do. */
async function changeStatus(
  id: string,
  mode: DemoMode,
  to: ProjectStatus,
  check: (project: ProjectRow, user: UserRow, contributions: ContributionRow[], expenses: ExpenseRow[]) => RuleResult,
  extra: { reason?: string; report?: string } = {},
): Promise<ProjectDetail> {
  await network(mode === 'empty' ? 'normal' : mode)
  const store = readStore()
  const user = requireUser(store)
  const project = findVisibleProject(store, id, user)
  ensure(check(project, user, store.contributions.filter((c) => c.projectId === id), store.expenses.filter((e) => e.projectId === id)))

  const from = project.status
  project.status = to
  if (extra.report !== undefined) project.report = extra.report
  appendAudit(store, { projectId: id, entityType: 'project', entityId: id, fromState: from, toState: to, actorId: user.id, reason: extra.reason ?? null })
  if (to === 'cancelled') {
    for (const c of store.contributions.filter((c) => c.projectId === id && c.status === 'committed')) {
      c.status = 'cancelled'
      appendAudit(store, { projectId: id, entityType: 'contribution', entityId: c.id, fromState: 'committed', toState: 'cancelled', actorId: user.id, reason: RELEASED_BY_CANCEL })
    }
  }
  writeStore(store)
  return detailOf(store, project)
}

export const startProject = (id: string, mode: DemoMode = 'normal') =>
  changeStatus(id, mode, 'in_progress', (project, user) => canStartProject(project, user))

export const completeProject = (id: string, input: CompleteInput, mode: DemoMode = 'normal') =>
  changeStatus(
    id,
    mode,
    'completed',
    (project, user, contributions, expenses) =>
      canCompleteProject(project, user, input, contributions, expenses.filter((e) => e.status === 'pending').length),
    {
    report: input.report.trim(),
  })

export const cancelProject = (id: string, input: CancelInput, mode: DemoMode = 'normal') =>
  changeStatus(id, mode, 'cancelled', (project, user) => canCancelProject(project, user, input), { reason: input.reason.trim() })
