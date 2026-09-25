import type { AuditRow } from '@gomnang/domain/types.ts'
import type { Exec } from '../database/client.ts'
import { auditLog } from '../database/schema.ts'

export async function appendAudit(exec: Exec, entry: Omit<AuditRow, 'id' | 'at'>) {
  await exec.insert(auditLog).values(entry)
}
