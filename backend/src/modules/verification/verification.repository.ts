import { inArray } from 'drizzle-orm'
import type { AssessmentResult } from '@gomnang/shared/assess.ts'
import type { AssessmentRow } from '@gomnang/shared/types.ts'
import type { Exec } from '../../db/client.ts'
import { assessments } from '../../db/schema.ts'

const toAssessmentRow = (a: typeof assessments.$inferSelect): AssessmentRow => ({
  id: a.id,
  projectId: a.projectId,
  source: a.source,
  verdict: a.verdict,
  signals: a.signals,
  similarProjects: a.similarProjects,
  createdAt: a.createdAt.toISOString(),
})

/** Tuần 4 người gác cổng chạy bằng quy tắc nên nguồn luôn là `rules`. Tuần 6 bản AI sẽ ghi `ai`. */
export async function insertAssessment(exec: Exec, projectId: string, result: AssessmentResult) {
  await exec.insert(assessments).values({ projectId, source: 'rules', ...result })
}

export async function assessmentsForProjects(exec: Exec, projectIds: string[]): Promise<AssessmentRow[]> {
  if (projectIds.length === 0) return []
  return (await exec.select().from(assessments).where(inArray(assessments.projectId, projectIds))).map(toAssessmentRow)
}
