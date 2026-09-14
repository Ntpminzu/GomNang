import { assessProject } from '@gomnang/domain/assess.ts'
import {
  DEMO_ASSESSMENTS,
  DEMO_AUDIT,
  DEMO_CONTRIBUTIONS,
  DEMO_NEEDS,
  DEMO_PROJECTS,
  DEMO_USERS,
} from '@gomnang/domain/demo-data.ts'
import {
  canCommit,
  canEditProject,
  canReviewProject,
  canSubmitProject,
  canTransitionContribution,
  canViewProject,
  type RuleResult,
} from '@gomnang/domain/rules.ts'
import {
  PUBLIC_PROJECT_STATUSES,
  type AssessmentRow,
  type AuditRow,
  type CommitInput,
  type Contribution,
  type ContributionRow,
  type Member,
  type NeedRow,
  type ProjectDetail,
  type ProjectInput,
  type ProjectRow,
  type ProjectStatus,
  type ProjectSummary,
  type QueueItem,
  type ReviewInput,
  type TransitionTarget,
  type UserRow,
} from '@gomnang/domain/types.ts'
import { todayInVietnam, validateProject } from '@gomnang/domain/validate-project.ts'
import { latestAssessment, toDetail, toMember, toNeedItems, toSummary, userRef } from '@gomnang/domain/views.ts'
import { getSessionUser } from './session.ts'

/**
 * MOCK API — Homework 3B.
 *
 * Mỗi hàm xuất ra ở đây ứng với đúng một endpoint trong docs/api-contract.md, trả về đúng hình dạng
 * dữ liệu, và ném ApiError với cùng mã HTTP + mã lỗi mà apps/api trả về. Quy tắc nghiệp vụ gọi thẳng
 * vào packages/domain — cùng một đoạn code với backend — nên mock không thể dễ tính hơn server thật.
 *
 * Dữ liệu lưu trong localStorage của trình duyệt, nạp sẵn từ bộ dữ liệu mẫu dùng chung.
 *
 * Homework 4B: thay thân từng hàm bằng fetch() tới apps/api. Tên hàm và kiểu trả về giữ nguyên,
 * nên không màn hình nào phải sửa.
 */

export class ApiError extends Error {
  status: number
  code: string
  details: Record<string, string> | undefined

  constructor(status: number, code: string, message: string, details?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  return new ApiError(500, 'UNKNOWN', err instanceof Error ? err.message : 'Lỗi không xác định.')
}

// ---------------------------------------------------------------------------
// Chế độ demo: trình bày đủ các trạng thái trên lớp mà không phải ngắt mạng.
// ---------------------------------------------------------------------------

export type DemoMode = 'normal' | 'slow' | 'empty' | 'error'

export const DEMO_MODES: { value: DemoMode; label: string }[] = [
  { value: 'normal', label: 'Bình thường' },
  { value: 'slow', label: 'Mạng chậm' },
  { value: 'empty', label: 'Không có dữ liệu' },
  { value: 'error', label: 'Máy chủ lỗi' },
]

export function parseDemoMode(value: string | null | undefined): DemoMode {
  return value === 'slow' || value === 'empty' || value === 'error' ? value : 'normal'
}

/** Đọc chế độ demo từ query string. Chỉ gọi được ở phía trình duyệt. */
export function readDemoModeFromUrl(): DemoMode {
  if (typeof window === 'undefined') return 'normal'
  return parseDemoMode(new URLSearchParams(window.location.search).get('state'))
}

export function withDemoMode(href: string, mode: DemoMode): string {
  return mode === 'normal' ? href : `${href}${href.includes('?') ? '&' : '?'}state=${mode}`
}

// ---------------------------------------------------------------------------
// Kho dữ liệu giả.
// ---------------------------------------------------------------------------

type Store = {
  users: UserRow[]
  projects: ProjectRow[]
  needs: NeedRow[]
  contributions: ContributionRow[]
  audit: AuditRow[]
  assessments: AssessmentRow[]
}

const STORE_KEY = 'gomnang.mockdb.v1'
const settings = { delayMs: 400, slowDelayMs: 2500, today: null as string | null }

/** Chỉ dùng trong test: bỏ độ trễ giả và cố định ngày hôm nay. */
export function configureMock(options: { delayMs?: number; slowDelayMs?: number; today?: string }) {
  Object.assign(settings, options)
}

const seedStore = (): Store =>
  structuredClone({
    users: DEMO_USERS,
    projects: DEMO_PROJECTS,
    needs: DEMO_NEEDS,
    contributions: DEMO_CONTRIBUTIONS,
    audit: DEMO_AUDIT,
    assessments: DEMO_ASSESSMENTS,
  })

/** Bản sao trong RAM, dùng khi trình duyệt chặn localStorage. */
let memoryStore: Store | null = null

function readStore(): Store {
  try {
    const raw = globalThis.localStorage?.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw) as Store
  } catch {
    // Dữ liệu hỏng hoặc bị chặn: dùng bản trong RAM, không có thì nạp lại dữ liệu mẫu.
  }
  return memoryStore ? structuredClone(memoryStore) : seedStore()
}

function writeStore(store: Store) {
  memoryStore = store
  try {
    globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify(store))
  } catch {
    // Không ghi được localStorage thì dữ liệu chỉ sống tới lần tải lại trang.
  }
}

export function resetMockData() {
  memoryStore = null
  try {
    globalThis.localStorage?.removeItem(STORE_KEY)
  } catch {
    // Không có gì để xoá.
  }
}

// ---------------------------------------------------------------------------
// Tiện ích dùng chung cho các "endpoint" giả.
// ---------------------------------------------------------------------------

async function network(mode: DemoMode) {
  const ms = mode === 'slow' ? settings.slowDelayMs : settings.delayMs
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms))
  if (mode === 'error') {
    throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.')
  }
}

const today = () => settings.today ?? todayInVietnam()
const now = () => new Date().toISOString()
const ACTIVE_STATUSES: readonly ProjectStatus[] = ['pending_verification', 'published', 'in_progress']

/** Giống bảng đổi mã trong apps/api/src/http.ts. */
const STATUS_BY_KIND = { forbidden: 403, conflict: 409, invalid: 422 } as const

function ensure(result: RuleResult) {
  if (!result.ok) throw new ApiError(STATUS_BY_KIND[result.kind], result.code, result.message)
}

const projectNotFound = () => new ApiError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.')

function currentUser(store: Store): UserRow | null {
  const session = getSessionUser()
  return session ? (store.users.find((u) => u.id === session.id) ?? null) : null
}

function requireUser(store: Store): UserRow {
  const user = currentUser(store)
  if (!user) throw new ApiError(401, 'AUTH_REQUIRED', 'Cần đăng nhập để thực hiện thao tác này.')
  return user
}

const usersMap = (store: Store) => new Map(store.users.map((u) => [u.id, u]))

function detailOf(store: Store, project: ProjectRow): ProjectDetail {
  return toDetail({
    project,
    needs: store.needs,
    contributions: store.contributions,
    audit: store.audit,
    assessments: store.assessments,
    users: usersMap(store),
  })
}

/** Không có quyền xem thì báo không tồn tại — giống backend, không để lộ là dự án có thật. */
function findVisibleProject(store: Store, id: string, user: UserRow | null): ProjectRow {
  const project = store.projects.find((p) => p.id === id)
  if (!project || !canViewProject(project, user)) throw projectNotFound()
  return project
}

function appendAudit(store: Store, entry: Omit<AuditRow, 'id' | 'at'>) {
  store.audit.push({ ...entry, id: crypto.randomUUID(), at: now() })
}

/** Backend cắt khoảng trắng thừa ở mọi chuỗi trước khi kiểm; mock làm y hệt. */
function normalizeInput(input: ProjectInput): ProjectInput {
  return {
    ...input,
    name: input.name.trim(),
    goal: input.goal.trim(),
    beneficiaryGroup: input.beneficiaryGroup.trim(),
    location: input.location.trim(),
    treasurerId: input.treasurerId || null,
    needItems: input.needItems.map((n) => ({ ...n, label: n.label.trim(), unit: n.unit.trim() })),
  }
}

const content = (source: Omit<ProjectInput, 'needItems'>) => ({
  name: source.name,
  goal: source.goal,
  beneficiaryGroup: source.beneficiaryGroup,
  location: source.location,
  startDate: source.startDate,
  endDate: source.endDate,
  treasurerId: source.treasurerId,
})

function checkProjectRules(store: Store, input: ProjectInput, coordinatorId: string) {
  const treasurer = input.treasurerId ? store.users.find((u) => u.id === input.treasurerId) : undefined
  const errors = validateProject(input, {
    today: today(),
    coordinatorId,
    treasurerVerified: input.treasurerId ? treasurer?.verified === true : undefined,
  })
  if (Object.keys(errors).length > 0) {
    throw new ApiError(422, 'VALIDATION_FAILED', 'Dữ liệu dự án chưa hợp lệ.', errors)
  }
}

function replaceNeeds(store: Store, projectId: string, items: ProjectInput['needItems']) {
  store.needs = store.needs.filter((n) => n.projectId !== projectId)
  items.forEach((item, position) => store.needs.push({ id: crypto.randomUUID(), projectId, position, ...item }))
}

// ---------------------------------------------------------------------------
// Các "endpoint". Tên trong chú thích là endpoint thật tương ứng.
// ---------------------------------------------------------------------------

/** GET /api/projects */
export async function listProjects(mode: DemoMode = 'normal'): Promise<ProjectSummary[]> {
  await network(mode)
  if (mode === 'empty') return []
  const store = readStore()
  return store.projects
    .filter((p) => PUBLIC_PROJECT_STATUSES.includes(p.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((p) => toSummary(p, store.needs, store.contributions))
}

/** GET /api/projects/{id} */
export async function getProject(id: string, mode: DemoMode = 'normal'): Promise<ProjectDetail> {
  await network(mode)
  if (mode === 'empty') throw projectNotFound()
  const store = readStore()
  return detailOf(store, findVisibleProject(store, id, currentUser(store)))
}

/** GET /api/users */
export async function listMembers(mode: DemoMode = 'normal'): Promise<Member[]> {
  await network(mode === 'empty' ? 'normal' : mode)
  const store = readStore()
  requireUser(store)
  return [...store.users].sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi')).map(toMember)
}

/** GET /api/verification-queue */
export async function getVerificationQueue(mode: DemoMode = 'normal'): Promise<QueueItem[]> {
  await network(mode)
  const store = readStore()
  const user = requireUser(store)
  if (!user.isVerifier) {
    throw new ApiError(403, 'NOT_VERIFIER', 'Chỉ người xác minh mới xem được hàng chờ xác minh.')
  }
  if (mode === 'empty') return []

  const users = usersMap(store)
  return store.projects
    .filter((p) => p.status === 'pending_verification')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((p) => ({
      ...toSummary(p, store.needs, store.contributions),
      coordinator: userRef(users, p.coordinatorId),
      latestAssessment: latestAssessment(store.assessments, p.id),
    }))
}

/** POST /api/projects */
export async function createProject(raw: ProjectInput, mode: DemoMode = 'normal'): Promise<ProjectDetail> {
  await network(mode === 'empty' ? 'normal' : mode)
  const store = readStore()
  const user = requireUser(store)
  const input = normalizeInput(raw)
  // Người điều phối luôn là người đang đăng nhập — giống backend.
  checkProjectRules(store, input, user.id)

  const project: ProjectRow = {
    id: crypto.randomUUID(),
    ...content(input),
    status: 'draft',
    coordinatorId: user.id,
    rejectionReason: null,
    createdAt: now(),
  }
  store.projects.push(project)
  replaceNeeds(store, project.id, input.needItems)
  appendAudit(store, {
    projectId: project.id,
    entityType: 'project',
    entityId: project.id,
    fromState: null,
    toState: 'draft',
    actorId: user.id,
    reason: null,
  })
  writeStore(store)
  return detailOf(store, project)
}

/** PUT /api/projects/{id} */
export async function updateProject(id: string, raw: ProjectInput, mode: DemoMode = 'normal'): Promise<ProjectDetail> {
  await network(mode === 'empty' ? 'normal' : mode)
  const store = readStore()
  const user = requireUser(store)
  const project = findVisibleProject(store, id, user)
  ensure(canEditProject(project, user))

  const input = normalizeInput(raw)
  checkProjectRules(store, input, project.coordinatorId)
  Object.assign(project, content(input))
  replaceNeeds(store, id, input.needItems)
  writeStore(store)
  return detailOf(store, project)
}

/** POST /api/projects/{id}/submit */
export async function submitProject(id: string, mode: DemoMode = 'normal'): Promise<ProjectDetail> {
  await network(mode === 'empty' ? 'normal' : mode)
  const store = readStore()
  const user = requireUser(store)
  const project = findVisibleProject(store, id, user)
  ensure(canSubmitProject(project, user))

  const input: ProjectInput = {
    ...content(project),
    needItems: store.needs
      .filter((n) => n.projectId === id)
      .sort((a, b) => a.position - b.position)
      .map(({ label, unit, kind, targetQty }) => ({ label, unit, kind, targetQty })),
  }
  checkProjectRules(store, input, project.coordinatorId)

  const others = store.projects.filter((p) => p.id !== id && ACTIVE_STATUSES.includes(p.status))
  store.assessments.push({ id: crypto.randomUUID(), projectId: id, source: 'rules', ...assessProject(input, others), createdAt: now() })
  project.status = 'pending_verification'
  project.rejectionReason = null
  appendAudit(store, {
    projectId: id,
    entityType: 'project',
    entityId: id,
    fromState: 'draft',
    toState: 'pending_verification',
    actorId: user.id,
    reason: null,
  })
  writeStore(store)
  return detailOf(store, project)
}

/** POST /api/projects/{id}/review */
export async function reviewProject(id: string, input: ReviewInput, mode: DemoMode = 'normal'): Promise<ProjectDetail> {
  await network(mode === 'empty' ? 'normal' : mode)
  const store = readStore()
  const user = requireUser(store)
  const project = findVisibleProject(store, id, user)
  ensure(canReviewProject(project, user, input))

  const next: ProjectStatus = input.decision === 'approve' ? 'published' : 'draft'
  const reason = input.reason?.trim() || null
  project.status = next
  project.rejectionReason = input.decision === 'reject' ? reason : null
  appendAudit(store, {
    projectId: id,
    entityType: 'project',
    entityId: id,
    fromState: 'pending_verification',
    toState: next,
    actorId: user.id,
    reason,
  })
  writeStore(store)
  return detailOf(store, project)
}

/** POST /api/projects/{id}/contributions */
export async function commitContribution(
  projectId: string,
  input: CommitInput,
  mode: DemoMode = 'normal',
): Promise<Contribution> {
  await network(mode === 'empty' ? 'normal' : mode)
  const store = readStore()
  const user = requireUser(store)
  const project = findVisibleProject(store, projectId, user)

  const need = store.needs.find((n) => n.id === input.needItemId && n.projectId === projectId)
  if (!need) throw new ApiError(404, 'NEED_NOT_FOUND', 'Không tìm thấy hạng mục nhu cầu này trong dự án.')
  const [totals] = toNeedItems([need], store.contributions)
  ensure(canCommit(project, totals, input.quantity))

  const row: ContributionRow = {
    id: crypto.randomUUID(),
    projectId,
    needItemId: need.id,
    contributorId: user.id,
    quantity: input.quantity,
    status: 'committed',
    createdAt: now(),
  }
  store.contributions.push(row)
  appendAudit(store, {
    projectId,
    entityType: 'contribution',
    entityId: row.id,
    fromState: null,
    toState: 'committed',
    actorId: user.id,
    reason: null,
  })
  writeStore(store)
  return detailOf(store, project).contributions.find((c) => c.id === row.id)!
}

/** POST /api/contributions/{id}/transition */
export async function transitionContribution(
  id: string,
  to: TransitionTarget,
  mode: DemoMode = 'normal',
): Promise<Contribution> {
  await network(mode === 'empty' ? 'normal' : mode)
  const store = readStore()
  const user = requireUser(store)

  const contribution = store.contributions.find((c) => c.id === id)
  const project = contribution && store.projects.find((p) => p.id === contribution.projectId)
  const need = contribution && store.needs.find((n) => n.id === contribution.needItemId)
  if (!contribution || !project || !need) {
    throw new ApiError(404, 'CONTRIBUTION_NOT_FOUND', 'Không tìm thấy đóng góp.')
  }
  ensure(canTransitionContribution(contribution, to, project, need.kind, user))

  const from = contribution.status
  contribution.status = to
  appendAudit(store, {
    projectId: project.id,
    entityType: 'contribution',
    entityId: id,
    fromState: from,
    toState: to,
    actorId: user.id,
    reason: null,
  })
  writeStore(store)
  return detailOf(store, project).contributions.find((c) => c.id === id)!
}
