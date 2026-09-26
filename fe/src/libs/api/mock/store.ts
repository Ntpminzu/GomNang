import { assessProject } from '@gomnang/domain/assess.ts'
import {
  DEMO_ASSESSMENTS,
  DEMO_AUDIT,
  DEMO_CONTRIBUTIONS,
  DEMO_EXPENSES,
  DEMO_NEEDS,
  DEMO_PROJECTS,
  DEMO_UPDATES,
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
  type ExpenseRow,
  type Member,
  type NeedRow,
  type ProjectDetail,
  type ProjectInput,
  type ProjectRow,
  type ProjectStatus,
  type ProjectSummary,
  type QueueItem,
  type ReviewInput,
  type UpdateRow,
  type TransitionTarget,
  type UserRow,
} from '@gomnang/domain/types.ts'
import { todayInVietnam, validateProject } from '@gomnang/domain/validate-project.ts'
import { latestAssessment, toDetail, toMember, toNeedItems, toSummary, userRef } from '@gomnang/domain/views.ts'
import { getSessionUser } from './session.ts'


import { ApiError } from '../errors.ts'
import type { DemoMode } from '../demo.ts'
export type Store = {
  users: UserRow[]
  projects: ProjectRow[]
  needs: NeedRow[]
  contributions: ContributionRow[]
  audit: AuditRow[]
  assessments: AssessmentRow[]
  updates: UpdateRow[]
  expenses: ExpenseRow[]
}

// v3: thêm bảng tin, sổ chi, ca tình nguyện — đổi khoá để dữ liệu cũ (thiếu các trường này) không làm vỡ trang.
export const STORE_KEY = 'gomnang.mockdb.v3'
export const settings = { delayMs: 400, slowDelayMs: 2500, today: null as string | null }

/** Chỉ dùng trong test: bỏ độ trễ giả và cố định ngày hôm nay. */
export function configureMock(options: { delayMs?: number; slowDelayMs?: number; today?: string }) {
  Object.assign(settings, options)
}

export const seedStore = (): Store =>
  structuredClone({
    users: DEMO_USERS,
    projects: DEMO_PROJECTS,
    needs: DEMO_NEEDS,
    contributions: DEMO_CONTRIBUTIONS,
    audit: DEMO_AUDIT,
    assessments: DEMO_ASSESSMENTS,
    updates: DEMO_UPDATES,
    expenses: DEMO_EXPENSES,
  })

/** Bản sao trong RAM, dùng khi trình duyệt chặn localStorage. */
let memoryStore: Store | null = null

export function readStore(): Store {
  try {
    const raw = globalThis.localStorage?.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw) as Store
  } catch {
    // Dữ liệu hỏng hoặc bị chặn: dùng bản trong RAM, không có thì nạp lại dữ liệu mẫu.
  }
  return memoryStore ? structuredClone(memoryStore) : seedStore()
}

export function writeStore(store: Store) {
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

export async function network(mode: DemoMode) {
  const ms = mode === 'slow' ? settings.slowDelayMs : settings.delayMs
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms))
  if (mode === 'error') {
    throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.')
  }
}

export const today = () => settings.today ?? todayInVietnam()
export const now = () => new Date().toISOString()
export const ACTIVE_STATUSES: readonly ProjectStatus[] = ['pending_verification', 'published', 'in_progress']

/** Giống bảng đổi mã ở middleware xử lý lỗi của backend. */
export const STATUS_BY_KIND = { forbidden: 403, conflict: 409, invalid: 422 } as const

export function ensure(result: RuleResult) {
  if (!result.ok) throw new ApiError(STATUS_BY_KIND[result.kind], result.code, result.message)
}

export const projectNotFound = () => new ApiError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.')

export function currentUser(store: Store): UserRow | null {
  const session = getSessionUser()
  return session ? (store.users.find((u) => u.id === session.id) ?? null) : null
}

export function requireUser(store: Store): UserRow {
  const user = currentUser(store)
  if (!user) throw new ApiError(401, 'AUTH_REQUIRED', 'Cần đăng nhập để thực hiện thao tác này.')
  return user
}

export const usersMap = (store: Store) => new Map(store.users.map((u) => [u.id, u]))

export function detailOf(store: Store, project: ProjectRow): ProjectDetail {
  return toDetail({
    project,
    needs: store.needs,
    contributions: store.contributions,
    audit: store.audit,
    assessments: store.assessments,
    updates: store.updates,
    expenses: store.expenses,
    users: usersMap(store),
  })
}

/** Không có quyền xem thì báo không tồn tại — giống backend, không để lộ là dự án có thật. */
export function findVisibleProject(store: Store, id: string, user: UserRow | null): ProjectRow {
  const project = store.projects.find((p) => p.id === id)
  if (!project || !canViewProject(project, user)) throw projectNotFound()
  return project
}

export function appendAudit(store: Store, entry: Omit<AuditRow, 'id' | 'at'>) {
  store.audit.push({ ...entry, id: crypto.randomUUID(), at: now() })
}

/** Backend cắt khoảng trắng thừa ở mọi chuỗi trước khi kiểm; mock làm y hệt. */
export function normalizeInput(input: ProjectInput): ProjectInput {
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

export const content = (source: Omit<ProjectInput, 'needItems'>) => ({
  name: source.name,
  goal: source.goal,
  beneficiaryGroup: source.beneficiaryGroup,
  location: source.location,
  startDate: source.startDate,
  endDate: source.endDate,
  treasurerId: source.treasurerId,
})

export function checkProjectRules(store: Store, input: ProjectInput, coordinatorId: string) {
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

export function replaceNeeds(store: Store, projectId: string, items: ProjectInput['needItems']) {
  store.needs = store.needs.filter((n) => n.projectId !== projectId)
  items.forEach((item, position) => store.needs.push({ id: crypto.randomUUID(), projectId, position, ...item, shift: item.shift ?? null }))
}
