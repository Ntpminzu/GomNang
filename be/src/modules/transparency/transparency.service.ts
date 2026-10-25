import { RECEIPT_MAX_BYTES, safeFileName, sniffReceiptType } from '@gomnang/domain/files.ts'
import { canPostUpdate, canRecordExpense, canReviewExpense, canUploadReceipt, canViewProject, canViewReceipt } from '@gomnang/domain/rules.ts'
import type { ExpenseInput, ExpenseReviewInput, UpdateInput, UserRow } from '@gomnang/domain/types.ts'
import { ledgerLines, toNeedItems } from '@gomnang/domain/views.ts'
import { HttpError, ensure } from '../../common/errors/http-error.ts'
import { log } from '../../infrastructure/logging/logger.ts'
import type { TransparencyDeps } from './transparency.types.ts'
const projectNotFound = () => new HttpError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.')
const expenseNotFound = () => new HttpError(404, 'EXPENSE_NOT_FOUND', 'Không tìm thấy khoản chi.')
const fileNotFound = () => new HttpError(404, 'FILE_NOT_FOUND', 'Không tìm thấy file, hoặc bạn không có quyền xem.')

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
    if (input.receiptFileId) {
      // Chỉ gắn được file chính mình vừa tải cho đúng dự án này và chưa gắn vào khoản chi nào.
      const file = await deps.transparency.findFile(tx, input.receiptFileId)
      if (!file || file.projectId !== projectId || file.uploadedBy !== user.id || file.expenseStatus !== null)
        throw new HttpError(422, 'INVALID_RECEIPT_FILE', 'Chứng từ không hợp lệ hoặc đã gắn vào khoản chi khác. Hãy tải lại file.')
    }

    const newId = await deps.transparency.insertExpense(tx, {
      projectId,
      needItemId: input.needItemId,
      amount: input.amount,
      description: input.description.trim(),
      receiptUrl: input.receiptUrl?.trim() || null,
      receiptFileId: input.receiptFileId ?? null,
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

/** Tải chứng từ lên trước, rồi gắn vào khoản chi bằng `receiptFileId` khi ghi chi. */
export async function uploadReceipt(deps: TransparencyDeps, projectId: string, upload: { bytes: Uint8Array; name: string }, user: UserRow) {
  const project = await deps.projects.findProject(deps.db, projectId)
  if (!project || !canViewProject(project, user)) throw projectNotFound()
  ensure(canUploadReceipt(project, user))
  if (upload.bytes.length === 0) throw new HttpError(400, 'EMPTY_FILE', 'Chưa có nội dung file. Hãy chọn lại file.')
  if (upload.bytes.length > RECEIPT_MAX_BYTES) throw new HttpError(413, 'FILE_TOO_LARGE', 'File vượt quá 3 MB. Hãy chụp lại ảnh nhỏ hơn hoặc nén file PDF.')
  const mime = sniffReceiptType(upload.bytes)
  if (!mime) throw new HttpError(415, 'UNSUPPORTED_FILE_TYPE', 'Chỉ nhận ảnh JPG, PNG, WebP hoặc file PDF.')
  const meta = await deps.transparency.insertFile(deps.db, {
    projectId,
    uploadedBy: user.id,
    name: safeFileName(upload.name),
    mime,
    size: upload.bytes.length,
    data: upload.bytes,
  })
  log('info', 'receipt uploaded', { projectId, fileId: meta.id, userId: user.id, mime, size: meta.size })
  return meta
}

/** Không có quyền thì trả 404 như dự án riêng: không để lộ là file có tồn tại. */
export async function readReceipt(deps: TransparencyDeps, id: string, user: UserRow | null) {
  const file = await deps.transparency.findFile(deps.db, id)
  if (!file) throw fileNotFound()
  const project = await deps.projects.findProject(deps.db, file.projectId)
  if (!project || !canViewReceipt(file, project, user)) throw fileNotFound()
  return { ...file, data: await deps.transparency.fileData(deps.db, id) }
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
