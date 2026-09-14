/**
 * Hợp đồng dữ liệu dùng chung giữa backend (backend) và frontend (frontend).
 * Đổi một kiểu ở đây thì cả hai phía cùng báo lỗi biên dịch — đó chính là mục đích.
 * Mô tả đầy đủ từng endpoint: docs/api-contract.md
 */

export const PROJECT_STATUSES = ['draft', 'pending_verification', 'published', 'in_progress', 'completed'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

/** Trạng thái mà người ngoài dự án được xem. Bản nháp và dự án chờ xác minh thì không. */
export const PUBLIC_PROJECT_STATUSES: readonly ProjectStatus[] = ['published', 'in_progress', 'completed']

/** Trạng thái dự án còn nhận đóng góp. */
export const ACCEPTING_STATUSES: readonly ProjectStatus[] = ['published', 'in_progress']

/** 5 hình thức đóng góp theo đặc tả bài toán §2.2. */
export const NEED_KINDS = ['money', 'goods', 'labor', 'skill', 'venue'] as const
export type NeedKind = (typeof NEED_KINDS)[number]

/** Chuỗi trạng thái đóng góp theo đặc tả §A2. `proposed` chưa có endpoint nào tạo ra ở tuần 4. */
export const CONTRIBUTION_STATUSES = ['proposed', 'committed', 'delivered', 'confirmed'] as const
export type ContributionStatus = (typeof CONTRIBUTION_STATUSES)[number]

export const VERDICTS = ['PASS', 'NEEDS_INFO', 'FLAG'] as const
export type Verdict = (typeof VERDICTS)[number]

export type AuditEntityType = 'project' | 'contribution'

// ---------------------------------------------------------------------------
// Dòng dữ liệu thô — đúng hình dạng một dòng trong bảng.
// Backend đọc từ PostgreSQL, mock của frontend giữ trong localStorage.
// ---------------------------------------------------------------------------

export type UserRow = {
  id: string
  email: string
  displayName: string
  verified: boolean
  isVerifier: boolean
}

export type ProjectRow = {
  id: string
  name: string
  goal: string
  beneficiaryGroup: string
  location: string
  startDate: string
  endDate: string
  status: ProjectStatus
  coordinatorId: string
  treasurerId: string | null
  rejectionReason: string | null
  createdAt: string
}

export type NeedRow = {
  id: string
  projectId: string
  label: string
  unit: string
  kind: NeedKind
  targetQty: number
  position: number
}

export type ContributionRow = {
  id: string
  projectId: string
  needItemId: string
  contributorId: string
  quantity: number
  status: ContributionStatus
  createdAt: string
}

export type AuditRow = {
  id: string
  projectId: string
  entityType: AuditEntityType
  entityId: string
  fromState: string | null
  toState: string
  actorId: string
  reason: string | null
  at: string
}

export type AssessmentSignal = { code: string; field: string | null; message: string }
export type SimilarProject = { id: string; name: string; similarity: number }

export type AssessmentRow = {
  id: string
  projectId: string
  source: 'rules' | 'ai'
  verdict: Verdict
  signals: AssessmentSignal[]
  similarProjects: SimilarProject[]
  createdAt: string
}

// ---------------------------------------------------------------------------
// Hình dạng API trả về.
// ---------------------------------------------------------------------------

export type UserRef = { id: string; name: string }

/** Không có email: danh sách thành viên hiện cho mọi người đã đăng nhập, email là dữ liệu cá nhân. */
export type Member = {
  id: string
  name: string
  verified: boolean
  isVerifier: boolean
}

export type NeedItem = {
  id: string
  label: string
  unit: string
  kind: NeedKind
  targetQty: number
  /** Tổng các đóng góp đã cam kết, đã bàn giao hoặc đã xác nhận. */
  committedQty: number
  /** Tổng các đóng góp đã bàn giao hoặc đã xác nhận. Bàn giao là lời người đóng góp tự báo. */
  deliveredQty: number
  /** Tổng các đóng góp đã được người khác xác nhận — con số duy nhất nên tin khi báo cáo. */
  confirmedQty: number
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
  needItemId: string
  needLabel: string
  needKind: NeedKind
  unit: string
  quantity: number
  status: ContributionStatus
  contributor: UserRef
  createdAt: string
}

export type AuditEntry = {
  id: string
  at: string
  actor: UserRef
  entityType: AuditEntityType
  entityId: string
  fromState: string | null
  toState: string
  reason: string | null
}

export type Assessment = Omit<AssessmentRow, 'projectId'>

export type ProjectDetail = ProjectSummary & {
  goal: string
  coordinator: UserRef
  treasurer: UserRef | null
  rejectionReason: string | null
  contributions: Contribution[]
  auditLog: AuditEntry[]
  latestAssessment: Assessment | null
}

export type QueueItem = ProjectSummary & {
  coordinator: UserRef
  latestAssessment: Assessment | null
}

// ---------------------------------------------------------------------------
// Dữ liệu gửi lên.
// ---------------------------------------------------------------------------

export type NeedItemInput = { label: string; unit: string; kind: NeedKind; targetQty: number }

export type ProjectInput = {
  name: string
  goal: string
  beneficiaryGroup: string
  location: string
  startDate: string
  endDate: string
  treasurerId: string | null
  needItems: NeedItemInput[]
}

export type ReviewInput = { decision: 'approve' | 'reject'; reason?: string }
export type CommitInput = { needItemId: string; quantity: number }
export type TransitionTarget = 'delivered' | 'confirmed'

export type ApiErrorBody = {
  error: { code: string; message: string; details?: Record<string, string> }
}

// ---------------------------------------------------------------------------
// Nhãn tiếng Việt.
// ---------------------------------------------------------------------------

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

export const VERDICT_LABEL: Record<Verdict, string> = {
  PASS: 'Đạt',
  NEEDS_INFO: 'Cần bổ sung thông tin',
  FLAG: 'Cần xem kỹ',
}

/** Đổi mã trạng thái trong sổ ghi vết sang chữ đọc được. */
export function stateLabel(entityType: AuditEntityType, state: string): string {
  const table: Record<string, string> = entityType === 'project' ? STATUS_LABEL : CONTRIBUTION_STATUS_LABEL
  return table[state] ?? state
}
