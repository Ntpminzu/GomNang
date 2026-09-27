import type { ProjectDetail } from '@gomnang/domain/types.ts'
import type { SessionUser } from '../../libs/session/index.ts'
import type { DemoMode } from '../../libs/api/demo.ts'
export type PanelProps = {
  project: ProjectDetail
  user: SessionUser | null
  mode: DemoMode
  /** Tải lại dự án; Promise xong khi dữ liệu mới đã về. */
  onChanged: () => Promise<void>
}
