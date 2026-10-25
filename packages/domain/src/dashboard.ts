import { allowedTransitions } from './rules.ts'
import {
  ACCEPTING_STATUSES,
  PUBLIC_PROJECT_STATUSES,
  type ContributionRow,
  type ContributionStatus,
  type ExpenseRow,
  type NeedRow,
  type ProjectRow,
  type ProjectStatus,
  type ProjectSummary,
  type UserRow,
} from './types.ts'
import { toSummary } from './views.ts'

/**
 * "Việc của tôi" và hồ sơ công khai — tính thẳng từ dữ liệu thô bằng đúng các luật trong rules.ts,
 * nên việc hiện ra luôn là việc người đó thật sự được phép làm.
 */

/** Thứ tự = độ ưu tiên hiển thị: việc chặn người khác lên trước. */
export const TASK_KINDS = [
  'review_project',
  'confirm_contributions',
  'review_expenses',
  'fix_draft',
  'deliver_pledge',
  'complete_project',
  'start_project',
  'submit_draft',
] as const
export type TaskKind = (typeof TASK_KINDS)[number]

export type Task = { kind: TaskKind; projectId: string; projectName: string; count: number; detail: string }

export type MyProject = ProjectSummary & { role: 'coordinator' | 'treasurer' }

export type MyContribution = {
  id: string
  projectId: string
  projectName: string
  needLabel: string
  unit: string
  quantity: number
  status: ContributionStatus
  createdAt: string
}

export type Dashboard = { tasks: Task[]; projects: MyProject[]; contributions: MyContribution[] }

export type DashboardSource = { projects: ProjectRow[]; needs: NeedRow[]; contributions: ContributionRow[]; expenses: ExpenseRow[] }

export function buildDashboard(user: Pick<UserRow, 'id' | 'role'>, src: DashboardSource, today: string): Dashboard {
  const actor = { id: user.id, role: user.role }
  const needById = new Map(src.needs.map((n) => [n.id, n]))
  const tasks: Task[] = []
  const add = (project: ProjectRow, kind: TaskKind, count: number, detail: string) =>
    count > 0 && tasks.push({ kind, projectId: project.id, projectName: project.name, count, detail })

  for (const project of src.projects) {
    const isCoordinator = project.coordinatorId === user.id
    const isTeam = isCoordinator || project.treasurerId === user.id
    const contributions = src.contributions.filter((c) => c.projectId === project.id)

    if ((user.role === 'verifier') && !isTeam && project.status === 'pending_verification')
      add(project, 'review_project', 1, 'Đang chờ bạn xác minh trước khi được công khai.')

    if (isCoordinator && project.status === 'draft') {
      if (project.rejectionReason) add(project, 'fix_draft', 1, `Bị trả lại: ${project.rejectionReason}`)
      else add(project, 'submit_draft', 1, 'Bản nháp chưa gửi đi xác minh.')
    }

    const toConfirm = contributions.filter(
      (c) =>
        c.status === 'delivered' &&
        allowedTransitions(c, project, needById.get(c.needItemId)?.kind ?? 'goods', actor).includes('confirmed'),
    ).length
    add(project, 'confirm_contributions', toConfirm, `${toConfirm} đóng góp đã bàn giao, chờ bạn xác nhận đã nhận.`)

    const pendingExpenses = src.expenses.filter((e) => e.projectId === project.id && e.status === 'pending').length
    if (isCoordinator) add(project, 'review_expenses', pendingExpenses, `${pendingExpenses} khoản chi chờ bạn duyệt.`)

    if (ACCEPTING_STATUSES.includes(project.status)) {
      const pledges = contributions.filter((c) => c.contributorId === user.id && c.status === 'committed').length
      add(project, 'deliver_pledge', pledges, `Bạn đã nhận góp ${pledges} phần. Trao xong thì bấm "Đã bàn giao".`)
    }

    if (isCoordinator && project.status === 'published' && project.startDate <= today)
      add(project, 'start_project', 1, 'Đã tới ngày bắt đầu — chuyển sang "Đang thực hiện" khi bắt tay làm.')

    const open = contributions.some((c) => c.status === 'committed' || c.status === 'delivered')
    if (isCoordinator && project.status === 'in_progress' && !open && pendingExpenses === 0)
      add(project, 'complete_project', 1, 'Mọi đóng góp đã có kết cục — có thể chốt sổ và đăng báo cáo.')
  }

  tasks.sort((a, b) => TASK_KINDS.indexOf(a.kind) - TASK_KINDS.indexOf(b.kind))

  const projects = src.projects
    .filter((p) => p.coordinatorId === user.id || p.treasurerId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((p): MyProject => ({ ...toSummary(p, src.needs, src.contributions), role: p.coordinatorId === user.id ? 'coordinator' : 'treasurer' }))

  const nameOf = new Map(src.projects.map((p) => [p.id, p.name]))
  const contributions = src.contributions
    .filter((c) => c.contributorId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((c): MyContribution => {
      const need = needById.get(c.needItemId)
      return {
        id: c.id,
        projectId: c.projectId,
        projectName: nameOf.get(c.projectId) ?? '',
        needLabel: need?.label ?? '',
        unit: need?.unit ?? '',
        quantity: c.quantity,
        status: c.status,
        createdAt: c.createdAt,
      }
    })

  return { tasks, projects, contributions }
}

export type Profile = {
  id: string
  name: string
  identityVerified: boolean
  role: import('./types.ts').Role
  stats: { coordinated: number; completed: number; confirmedContributions: number; projectsHelped: number }
  /** Dự án công khai người này điều phối. */
  projects: ProjectSummary[]
  /** Đóng góp đã được xác nhận ở dự án công khai, mới nhất trước. */
  helped: (MyContribution & { projectStatus: ProjectStatus })[]
}

/** Hồ sơ công khai: chỉ đếm dự án đã công khai và đóng góp đã được người khác xác nhận — không tự khai được. */
export function toProfile(user: UserRow, src: Omit<DashboardSource, 'expenses'>): Profile {
  const publicProjects = src.projects.filter((p) => PUBLIC_PROJECT_STATUSES.includes(p.status))
  const byId = new Map(publicProjects.map((p) => [p.id, p]))
  const needById = new Map(src.needs.map((n) => [n.id, n]))
  const coordinated = publicProjects.filter((p) => p.coordinatorId === user.id)
  const helped = src.contributions
    .filter((c) => c.contributorId === user.id && c.status === 'confirmed' && byId.has(c.projectId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((c) => {
      const project = byId.get(c.projectId)!
      const need = needById.get(c.needItemId)
      return {
        id: c.id,
        projectId: c.projectId,
        projectName: project.name,
        projectStatus: project.status,
        needLabel: need?.label ?? '',
        unit: need?.unit ?? '',
        quantity: c.quantity,
        status: c.status,
        createdAt: c.createdAt,
      }
    })

  return {
    id: user.id,
    name: user.displayName,
    identityVerified: user.identityVerified,
    role: user.role,
    stats: {
      coordinated: coordinated.length,
      completed: coordinated.filter((p) => p.status === 'completed').length,
      confirmedContributions: helped.length,
      projectsHelped: new Set(helped.map((h) => h.projectId)).size,
    },
    projects: coordinated
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => toSummary(p, src.needs, src.contributions)),
    helped,
  }
}
