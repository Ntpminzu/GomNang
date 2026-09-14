import type { ProjectDetail } from '@gomnang/domain/types.ts'
export const projectRef = (p: ProjectDetail) => ({
  status: p.status,
  coordinatorId: p.coordinator.id,
  treasurerId: p.treasurer?.id ?? null,
})
