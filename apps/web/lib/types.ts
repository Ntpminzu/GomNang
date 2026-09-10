export type ProjectStatus =
  | 'draft'
  | 'pending_verification'
  | 'published'
  | 'in_progress'
  | 'completed'

/** 5 hình thức đóng góp theo đặc tả bài toán §2.2. */
export type NeedKind = 'money' | 'goods' | 'labor' | 'skill' | 'venue'

export type ContributionStatus = 'proposed' | 'committed' | 'delivered' | 'confirmed'

export type NeedItem = {
  id: string
  label: string
  unit: string
  kind: NeedKind
  targetQty: number
  committedQty: number
  deliveredQty: number
}

export type ProjectSummary = {
  id: string
  name: string
  status: ProjectStatus
  beneficiaryGroup: string
  location: string
  startDate: string
  endDate: string
  needs: NeedItem[]
}

export type Contribution = {
  id: string
  contributorName: string
  needLabel: string
  quantity: number
  unit: string
  status: ContributionStatus
}

/** Bảng chỉ ghi thêm — hiện thực NFR "Minh bạch". Xem architecture.md §3. */
export type AuditEntry = {
  id: string
  at: string
  actorName: string
  entity: string
  fromState: string | null
  toState: string
}

export type ProjectDetail = ProjectSummary & {
  goal: string
  coordinatorName: string
  treasurerName: string | null
  contributions: Contribution[]
  auditLog: AuditEntry[]
}

export type Member = { id: string; name: string; verified: boolean }

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: 'Bản nháp',
  pending_verification: 'Chờ xác minh',
  published: 'Đang kêu gọi',
  in_progress: 'Đang thực hiện',
  completed: 'Đã hoàn thành',
}

export const NEED_KIND_LABEL: Record<NeedKind, string> = {
  money: 'Tiền',
  goods: 'Vật phẩm',
  labor: 'Công sức',
  skill: 'Kỹ năng',
  venue: 'Phương tiện / địa điểm',
}

export const CONTRIBUTION_STATUS_LABEL: Record<ContributionStatus, string> = {
  proposed: 'Đề xuất',
  committed: 'Đã cam kết',
  delivered: 'Đã bàn giao',
  confirmed: 'Đã xác nhận',
}
