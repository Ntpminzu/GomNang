import {
  DEMO_ASSESSMENTS,
  DEMO_AUDIT,
  DEMO_CONTRIBUTIONS,
  DEMO_EXPENSES,
  DEMO_NEEDS,
  DEMO_PROJECTS,
  DEMO_UPDATES,
  DEMO_USERS,
} from '@gomnang/domain/demo-data.ts'
import type { Db } from './client.ts'
import { assessments, auditLog, contributions, expenses, needItems, projectUpdates, projects, users } from './schema.ts'

/**
 * Nạp dữ liệu mẫu nếu database còn trống. Trả về `true` nếu vừa nạp.
 * Ghi thẳng vào bảng, không đi qua quy tắc nghiệp vụ — đây là dữ liệu dựng sẵn, không phải thao tác người dùng.
 */
export async function seedIfEmpty(db: Db): Promise<boolean> {
  const existing = await db.select({ id: users.id }).from(users).limit(1)
  if (existing.length > 0) return false

  await db.transaction(async (tx) => {
    await tx.insert(users).values(DEMO_USERS)
    await tx
      .insert(projects)
      .values(DEMO_PROJECTS.map((p) => ({ ...p, createdAt: new Date(p.createdAt), updatedAt: new Date(p.createdAt) })))
    await tx.insert(needItems).values(DEMO_NEEDS)
    await tx
      .insert(contributions)
      .values(DEMO_CONTRIBUTIONS.map((c) => ({ ...c, createdAt: new Date(c.createdAt), updatedAt: new Date(c.createdAt) })))
    await tx.insert(assessments).values(DEMO_ASSESSMENTS.map((a) => ({ ...a, createdAt: new Date(a.createdAt) })))
    await tx.insert(auditLog).values(DEMO_AUDIT.map((a) => ({ ...a, at: new Date(a.at) })))
    await tx.insert(projectUpdates).values(DEMO_UPDATES.map((u) => ({ ...u, createdAt: new Date(u.createdAt) })))
    await tx.insert(expenses).values(DEMO_EXPENSES.map((e) => ({ ...e, createdAt: new Date(e.createdAt), updatedAt: new Date(e.createdAt) })))
  })
  return true
}
