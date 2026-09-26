/**
 * Hợp đồng dữ liệu dùng chung giữa backend (`be`) và frontend (`fe`).
 * Đổi một kiểu ở đây thì cả hai phía cùng báo lỗi biên dịch — đó chính là mục đích.
 * Mô tả đầy đủ từng endpoint: docs/api-contract.md
 */

export const PROJECT_STATUSES = ['draft', 'pending_verification', 'published', 'in_progress', 'completed', 'cancelled'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

/** Trạng thái mà người ngoài dự án được xem. Bản nháp và dự án chờ xác minh thì không. */
export const PUBLIC_PROJECT_STATUSES: readonly ProjectStatus[] = ['published', 'in_progress', 'completed', 'cancelled']

/** Trạng thái dự án còn nhận đóng góp. */
export const ACCEPTING_STATUSES: readonly ProjectStatus[] = ['published', 'in_progress']

/** 5 hình thức đóng góp theo đặc tả bài toán §2.2. */
export const NEED_KINDS = ['money', 'goods', 'labor', 'skill', 'venue'] as const
export type NeedKind = (typeof NEED_KINDS)[number]

/** Chuỗi trạng thái đóng góp theo đặc tả §A2. `proposed` chưa có endpoint nào tạo ra ở tuần 4. */
export const CONTRIBUTION_STATUSES = ['proposed', 'committed', 'delivered', 'confirmed', 'cancelled'] as const
export type ContributionStatus = (typeof CONTRIBUTION_STATUSES)[number]

export const VERDICTS = ['PASS', 'NEEDS_INFO', 'FLAG'] as const
export type Verdict = (typeof VERDICTS)[number]

/** Khoản chi trong sổ thu chi: người phụ trách tài chính ghi, người điều phối duyệt. */
export const EXPENSE_STATUSES = ['pending', 'approved', 'rejected'] as const
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number]

export type AuditEntityType = 'project' | 'contribution' | 'expense'

// ---------------------------------------------------------------------------
// Dòng dữ liệu thô — đúng hình dạng một dòng trong bảng.
// Backend đọc từ PostgreSQL, mock của frontend giữ trong localStorage.
// ---------------------------------------------------------------------------

export type UserRow = {
  id: string
  email: string
  displayName: string
  phone?: string | null
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
  /** Báo cáo tổng kết, có khi dự án hoàn thành. */
  report: string | null
  createdAt: string
}

/** Ca tình nguyện (kiểu SignUpGenius) cho nhu cầu công sức / kỹ năng: ngày, khung giờ HH:MM, điểm tập kết. */
export type Shift = { date: string; start: string; end: string; place: string }

export type NeedRow = {
  id: string
  projectId: string
  label: string
  unit: string
  kind: NeedKind
  targetQty: number
  position: number
  shift: Shift | null
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

/** Tin cập nhật tiến độ do nhóm dự án đăng (kiểu "Kabar terbaru" của Kitabisa). */
export type UpdateRow = {
  id: string
  projectId: string
  authorId: string
  body: string
  createdAt: string
}

/** Một khoản chi, luôn gắn với một hạng mục tiền của dự án — hạng mục đó là "dòng ngân sách". */
export type ExpenseRow = {
  id: string
  projectId: string
  needItemId: string
  amount: number
  description: string
  receiptUrl: string | null
  status: ExpenseStatus
  recordedBy: string
  reviewedBy: string | null
  reviewReason: string | null
  createdAt: string
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
  shift: Shift | null
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

export type ChatTurn = { role: 'user' | 'assistant'; content: string }
export type ChatProvider = 'ollama' | 'gemini'
export type ChatModelOption = { id: ChatProvider; name: string; available: boolean }
export type ChatRequest = { message: string; model?: ChatProvider; history?: ChatTurn[] }
export type ChatSource = { citation: string; id: string; title: string; url: string; excerpt: string }
export type ChatReply = { reply: string; sources: ChatSource[]; generatedByModel: boolean }

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

export type ProjectUpdate = { id: string; author: UserRef; body: string; createdAt: string }

export type Expense = {
  id: string
  needItemId: string
  needLabel: string
  unit: string
  amount: number
  description: string
  receiptUrl: string | null
  status: ExpenseStatus
  recordedBy: UserRef
  reviewedBy: UserRef | null
  reviewReason: string | null
  createdAt: string
}

export type Assessment = Omit<AssessmentRow, 'projectId'>

export type ProjectDetail = ProjectSummary & {
  goal: string
  coordinator: UserRef
  treasurer: UserRef | null
  rejectionReason: string | null
  report: string | null
  contributions: Contribution[]
  auditLog: AuditEntry[]
  latestAssessment: Assessment | null
  /** Mới nhất ở trên. */
  updates: ProjectUpdate[]
  /** Cũ nhất ở trên, như sổ sách. */
  expenses: Expense[]
}

export type QueueItem = ProjectSummary & {
  coordinator: UserRef
  latestAssessment: Assessment | null
}

// ---------------------------------------------------------------------------
// Dữ liệu gửi lên.
// ---------------------------------------------------------------------------

export type NeedItemInput = { label: string; unit: string; kind: NeedKind; targetQty: number; shift?: Shift | null }

/** Nhu cầu nào được gắn ca làm việc. */
export const SHIFT_KINDS: readonly NeedKind[] = ['labor', 'skill']

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
export type TransitionTarget = 'delivered' | 'confirmed' | 'cancelled'
/** `note`: ghi chú khi bàn giao hoặc lý do huỷ — lưu vào sổ ghi vết. */
export type TransitionInput = { to: TransitionTarget; note?: string }
export type CompleteInput = { report: string }
export type CancelInput = { reason: string }
export type UpdateInput = { body: string }
export type ExpenseInput = { needItemId: string; amount: number; description: string; receiptUrl?: string }
export type ExpenseReviewInput = { decision: 'approve' | 'reject'; reason?: string }

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
  cancelled: 'Đã huỷ',
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
  cancelled: 'Đã huỷ',
}

export const EXPENSE_STATUS_LABEL: Record<ExpenseStatus, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Bị từ chối',
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  PASS: 'Đạt',
  NEEDS_INFO: 'Cần bổ sung thông tin',
  FLAG: 'Cần xem kỹ',
}

/** Đổi mã trạng thái trong sổ ghi vết sang chữ đọc được. */
export function stateLabel(entityType: AuditEntityType, state: string): string {
  const table: Record<string, string> =
    entityType === 'project' ? STATUS_LABEL : entityType === 'expense' ? EXPENSE_STATUS_LABEL : CONTRIBUTION_STATUS_LABEL
  return table[state] ?? state
}
