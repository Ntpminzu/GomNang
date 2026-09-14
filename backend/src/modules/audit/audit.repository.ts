import { asc, eq } from 'drizzle-orm'
import type { AuditRow } from '@gomnang/shared/types.ts'
import type { Exec } from '../../db/client.ts'
import { auditLog } from '../../db/schema.ts'

/**
 * Sổ ghi vết, dùng chung cho mọi module có đổi trạng thái.
 * Chỉ có thêm và đọc — không có hàm sửa hay xoá. Database cũng chặn UPDATE, DELETE, TRUNCATE
 * bằng trigger (migration 0001), nên kể cả chạy SQL trực tiếp cũng không sửa được lịch sử.
 */

const toAuditRow = (a: typeof auditLog.$inferSelect): AuditRow => ({
  id: a.id,
  projectId: a.projectId,
  entityType: a.entityType,
  entityId: a.entityId,
  fromState: a.fromState,
  toState: a.toState,
  actorId: a.actorId,
  reason: a.reason,
  at: a.at.toISOString(),
})

export async function appendAudit(exec: Exec, entry: Omit<AuditRow, 'id' | 'at'>) {
  await exec.insert(auditLog).values(entry)
}

export async function auditForProject(exec: Exec, projectId: string): Promise<AuditRow[]> {
  const rows = await exec.select().from(auditLog).where(eq(auditLog.projectId, projectId)).orderBy(asc(auditLog.at))
  return rows.map(toAuditRow)
}
