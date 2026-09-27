import { canPostUpdate, canRecordExpense, canReviewExpense } from '@gomnang/domain/rules.ts'
import type { Expense, ExpenseInput, ExpenseReviewInput, ProjectUpdate, UpdateInput } from '@gomnang/domain/types.ts'
import { ledgerLines, toNeedItems } from '@gomnang/domain/views.ts'
import { ApiError } from '../errors.ts'
import type { DemoMode } from '../demo.ts'
import { appendAudit, detailOf, ensure, findVisibleProject, network, now, readStore, requireUser, writeStore } from './store.ts'

/** Giống transparency.service ở backend: cùng luật trong packages/domain, cùng mã lỗi. */

export async function postUpdate(projectId: string, input: UpdateInput, mode: DemoMode = 'normal'): Promise<ProjectUpdate> {
  await network(mode === 'empty' ? 'normal' : mode)
  const store = readStore()
  const user = requireUser(store)
  const project = findVisibleProject(store, projectId, user)
  ensure(canPostUpdate(project, user, input))

  const id = crypto.randomUUID()
  store.updates.push({ id, projectId, authorId: user.id, body: input.body.trim(), createdAt: now() })
  writeStore(store)
  return detailOf(store, project).updates.find((u) => u.id === id)!
}

export async function recordExpense(projectId: string, input: ExpenseInput, mode: DemoMode = 'normal'): Promise<Expense> {
  await network(mode === 'empty' ? 'normal' : mode)
  const store = readStore()
  const user = requireUser(store)
  const project = findVisibleProject(store, projectId, user)
  const needs = toNeedItems(
    store.needs.filter((n) => n.projectId === projectId),
    store.contributions.filter((c) => c.projectId === projectId),
  )
  const line = ledgerLines(needs, store.expenses.filter((e) => e.projectId === projectId)).find((l) => l.needItemId === input.needItemId)
  ensure(canRecordExpense(project, user, line, input))

  const id = crypto.randomUUID()
  store.expenses.push({
    id,
    projectId,
    needItemId: input.needItemId,
    amount: input.amount,
    description: input.description.trim(),
    receiptUrl: input.receiptUrl?.trim() || null,
    status: 'pending',
    recordedBy: user.id,
    reviewedBy: null,
    reviewReason: null,
    createdAt: now(),
  })
  appendAudit(store, { projectId, entityType: 'expense', entityId: id, fromState: null, toState: 'pending', actorId: user.id, reason: null })
  writeStore(store)
  return detailOf(store, project).expenses.find((e) => e.id === id)!
}

export async function reviewExpense(id: string, input: ExpenseReviewInput, mode: DemoMode = 'normal'): Promise<Expense> {
  await network(mode === 'empty' ? 'normal' : mode)
  const store = readStore()
  const user = requireUser(store)
  const expense = store.expenses.find((e) => e.id === id)
  if (!expense) throw new ApiError(404, 'EXPENSE_NOT_FOUND', 'Không tìm thấy khoản chi.')
  const project = findVisibleProject(store, expense.projectId, user)
  ensure(canReviewExpense(project, user, expense, input))

  const to = input.decision === 'approve' ? 'approved' : 'rejected'
  const reason = input.reason?.trim() || null
  Object.assign(expense, { status: to, reviewedBy: user.id, reviewReason: reason })
  appendAudit(store, { projectId: project.id, entityType: 'expense', entityId: id, fromState: 'pending', toState: to, actorId: user.id, reason })
  writeStore(store)
  return detailOf(store, project).expenses.find((e) => e.id === id)!
}
