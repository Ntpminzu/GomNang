import { canPostUpdate, canRecordExpense, canReviewExpense, canViewProject } from '@gomnang/domain/rules.ts'
import type { ExpenseInput, ExpenseReviewInput, UpdateInput, UserRow } from '@gomnang/domain/types.ts'
import { ledgerLines, toNeedItems } from '@gomnang/domain/views.ts'
import { HttpError, ensure } from '../../common/errors/http-error.ts'
import { log } from '../../infrastructure/logging/logger.ts'
import type { TransparencyDeps } from './transparency.types.ts'
const projectNotFound = () => new HttpError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.')
const expenseNotFound = () => new HttpError(404, 'EXPENSE_NOT_FOUND', 'Không tìm thấy khoản chi.')

export async function postUpdate(deps: TransparencyDeps, projectId: string, input: UpdateInput, user: UserRow) {
  const id = await deps.db.transaction(async (tx) => {
    const project = await deps.projects.findProject(tx, projectId)
    if (!project || !canViewProject(project, user)) throw projectNotFound()
    ensure(canPostUpdate(project, user, input))
    return deps.transparency.insertUpdate(tx, { projectId, authorId: user.id, body: input.body.trim() })
  })
  log('info', 'project update posted', { projectId, updateId: id, userId: user.id })
  const detail = await deps.projects.loadDetail(deps.db, projectId)
  return detail?.updates.find((u) => u.id === id)
}

export async function recordExpense(deps: TransparencyDeps, projectId: string, input: ExpenseInput, user: UserRow) {
  const id = await deps.db.transaction(async (tx) => {
    // Khoá dòng dự án: hai khoản chi ghi cùng lúc không thể cùng tiêu một phần số dư.
    const project = await deps.projects.findProject(tx, projectId, { lock: true })
    if (!project || !canViewProject(project, user)) throw projectNotFound()
    const { needs, contributions } = await deps.projects.loadChildren(tx, [projectId])
    const expenses = await deps.projects.listExpenses(tx, projectId)
    const line = ledgerLines(toNeedItems(needs, contributions), expenses).find((l) => l.needItemId === input.needItemId)
    ensure(canRecordExpense(project, user, line, input))

    const newId = await deps.transparency.insertExpense(tx, {
      projectId,
      needItemId: input.needItemId,
      amount: input.amount,
      description: input.description.trim(),
      receiptUrl: input.receiptUrl?.trim() || null,
      recordedBy: user.id,
    })
    await deps.audit.appendAudit(tx, {
      projectId,
      entityType: 'expense',
      entityId: newId,
      fromState: null,
      toState: 'pending',
      actorId: user.id,
      reason: null,
    })
    return newId
  })
  log('info', 'expense recorded', { projectId, expenseId: id, userId: user.id, amount: input.amount })
  const detail = await deps.projects.loadDetail(deps.db, projectId)
  return detail?.expenses.find((e) => e.id === id)
}

export async function reviewExpense(deps: TransparencyDeps, id: string, input: ExpenseReviewInput, user: UserRow) {
  const projectId = await deps.db.transaction(async (tx) => {
    const expense = await deps.transparency.findExpense(tx, id, { lock: true })
    if (!expense) throw expenseNotFound()
    const project = await deps.projects.findProject(tx, expense.projectId)
    if (!project || !canViewProject(project, user)) throw expenseNotFound()
    ensure(canReviewExpense(project, user, expense, input))

    const to = input.decision === 'approve' ? 'approved' : 'rejected'
    const reason = input.reason?.trim() || null
    await deps.transparency.setExpenseReview(tx, id, to, user.id, reason)
    await deps.audit.appendAudit(tx, {
      projectId: project.id,
      entityType: 'expense',
      entityId: id,
      fromState: 'pending',
      toState: to,
      actorId: user.id,
      reason,
    })
    return project.id
  })
  log('info', 'expense reviewed', { expenseId: id, userId: user.id, decision: input.decision })
  const detail = await deps.projects.loadDetail(deps.db, projectId)
  return detail?.expenses.find((e) => e.id === id)
}
