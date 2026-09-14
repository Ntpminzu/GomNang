import type { ProjectDetail } from '@gomnang/shared/types.ts'
import type { SessionUser } from '../../lib/session.ts'

/** Props chung của các khối thao tác trên trang chi tiết dự án — dùng ở cả projects, verification và contributions. */
export type PanelProps = {
  project: ProjectDetail
  user: SessionUser | null
  onChanged: () => void
}

/** Rút gọn dự án về đúng các trường mà quy tắc trong shared/rules.ts cần. */
export const projectRef = (p: ProjectDetail) => ({
  status: p.status,
  coordinatorId: p.coordinator.id,
  treasurerId: p.treasurer?.id ?? null,
})
