import type {
  AssessmentRow,
  AuditRow,
  ContributionRow,
  ContributionStatus,
  Member,
  NeedItem,
  NeedRow,
  ProjectDetail,
  ProjectRow,
  ProjectSummary,
  UserRef,
  UserRow,
} from './types.ts'

/**
 * Ghép các dòng dữ liệu thô thành đúng hình dạng API trả về.
 *
 * Số lượng cam kết / bàn giao / xác nhận luôn được TÍNH từ bảng đóng góp, không lưu sẵn
 * thành cột riêng — nên không bao giờ có chuyện con số trên màn hình lệch với sổ đóng góp.
 */

const COUNTS_AS_COMMITTED: ReadonlySet<ContributionStatus> = new Set(['committed', 'delivered', 'confirmed'])
const COUNTS_AS_DELIVERED: ReadonlySet<ContributionStatus> = new Set(['delivered', 'confirmed'])

const sumQuantity = (rows: ContributionRow[]) => rows.reduce((total, c) => total + c.quantity, 0)
const byTime = <T>(pick: (row: T) => string) => (a: T, b: T) => pick(a).localeCompare(pick(b))

export function toNeedItems(needs: NeedRow[], contributions: ContributionRow[]): NeedItem[] {
  return [...needs]
    .sort((a, b) => a.position - b.position)
    .map((need) => {
      const forNeed = contributions.filter((c) => c.needItemId === need.id)
      return {
        id: need.id,
        label: need.label,
        unit: need.unit,
        kind: need.kind,
        targetQty: need.targetQty,
        committedQty: sumQuantity(forNeed.filter((c) => COUNTS_AS_COMMITTED.has(c.status))),
        deliveredQty: sumQuantity(forNeed.filter((c) => COUNTS_AS_DELIVERED.has(c.status))),
        confirmedQty: sumQuantity(forNeed.filter((c) => c.status === 'confirmed')),
      }
    })
}

export function toSummary(project: ProjectRow, needs: NeedRow[], contributions: ContributionRow[]): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    beneficiaryGroup: project.beneficiaryGroup,
    location: project.location,
    startDate: project.startDate,
    endDate: project.endDate,
    needs: toNeedItems(
      needs.filter((n) => n.projectId === project.id),
      contributions.filter((c) => c.projectId === project.id),
    ),
  }
}

export function toMember(user: UserRow): Member {
  return {
    id: user.id,
    name: user.displayName,
    verified: user.verified,
    isVerifier: user.isVerifier,
  }
}

export function userRef(users: ReadonlyMap<string, UserRow>, id: string): UserRef {
  return { id, name: users.get(id)?.displayName ?? 'Người dùng không còn tồn tại' }
}

export function latestAssessment(rows: AssessmentRow[], projectId: string) {
  const latest = rows.filter((a) => a.projectId === projectId).sort(byTime((a) => a.createdAt)).at(-1)
  if (!latest) return null
  const { projectId: _omit, ...assessment } = latest
  return assessment
}

export type DetailSource = {
  project: ProjectRow
  needs: NeedRow[]
  contributions: ContributionRow[]
  audit: AuditRow[]
  assessments: AssessmentRow[]
  users: ReadonlyMap<string, UserRow>
}

export function toDetail(src: DetailSource): ProjectDetail {
  const { project, users } = src
  const needs = src.needs.filter((n) => n.projectId === project.id)
  const contributions = src.contributions.filter((c) => c.projectId === project.id)
  const needById = new Map(needs.map((n) => [n.id, n]))

  return {
    ...toSummary(project, needs, contributions),
    goal: project.goal,
    coordinator: userRef(users, project.coordinatorId),
    treasurer: project.treasurerId ? userRef(users, project.treasurerId) : null,
    rejectionReason: project.rejectionReason,
    contributions: [...contributions].sort(byTime((c) => c.createdAt)).map((c) => {
      const need = needById.get(c.needItemId)
      return {
        id: c.id,
        needItemId: c.needItemId,
        needLabel: need?.label ?? '',
        needKind: need?.kind ?? 'goods',
        unit: need?.unit ?? '',
        quantity: c.quantity,
        status: c.status,
        contributor: userRef(users, c.contributorId),
        createdAt: c.createdAt,
      }
    }),
    auditLog: src.audit
      .filter((a) => a.projectId === project.id)
      .sort(byTime((a) => a.at))
      .map((a) => ({
        id: a.id,
        at: a.at,
        actor: userRef(users, a.actorId),
        entityType: a.entityType,
        entityId: a.entityId,
        fromState: a.fromState,
        toState: a.toState,
        reason: a.reason,
      })),
    latestAssessment: latestAssessment(src.assessments, project.id),
  }
}
