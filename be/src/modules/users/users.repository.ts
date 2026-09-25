import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm'
import type { AssessmentResult } from '@gomnang/domain/assess.ts'
import type { AssessmentRow, AuditRow, ContributionRow, ContributionStatus, NeedItem, NeedRow, ProjectDetail, ProjectInput, ProjectRow, ProjectStatus, ProjectSummary, QueueItem, UserRow } from '@gomnang/domain/types.ts'
import { latestAssessment, toDetail, toNeedItems, toSummary, userRef } from '@gomnang/domain/views.ts'
import type { Exec } from '../../infrastructure/database/client.ts'
import { assessments, auditLog, contributions, needItems, projects, users } from '../../infrastructure/database/schema.ts'
import { toUserRow } from '../users/users.mapper.ts'
import { toProjectRow } from '../projects/projects.mapper.ts'
import { toNeedRow } from '../projects/projects.mapper.ts'
import { toContributionRow } from '../contributions/contributions.mapper.ts'
import { toAuditRow } from '../../infrastructure/audit/audit.mapper.ts'
import { toAssessmentRow } from '../verification/verification.mapper.ts'
export async function findUser(exec: Exec, id: string): Promise<UserRow | null> {
  const [row] = await exec.select().from(users).where(eq(users.id, id))
  return row ? toUserRow(row) : null
}

export async function findUserByEmail(exec: Exec, email: string): Promise<UserRow | null> {
  const [row] = await exec.select().from(users).where(eq(users.email, email))
  return row ? toUserRow(row) : null
}

export async function findUserWithPassword(exec: Exec, email: string) {
  const [row] = await exec.select().from(users).where(eq(users.email, email))
  return row ?? null
}

export async function insertUser(
  exec: Exec,
  data: { email: string; displayName: string; phone: string; passwordHash: string },
) {
  const [row] = await exec
    .insert(users)
    .values({
      email: data.email,
      displayName: data.displayName,
      phone: data.phone,
      passwordHash: data.passwordHash,
    })
    .returning()
  return row
}

export async function listUsers(exec: Exec): Promise<UserRow[]> {
  return (await exec.select().from(users).orderBy(asc(users.displayName))).map(toUserRow)
}

export async function usersById(exec: Exec, ids: string[]): Promise<Map<string, UserRow>> {
  const unique = [...new Set(ids)]
  const rows = unique.length > 0 ? await exec.select().from(users).where(inArray(users.id, unique)) : []
  return new Map(rows.map((r) => [r.id, toUserRow(r)]))
}
