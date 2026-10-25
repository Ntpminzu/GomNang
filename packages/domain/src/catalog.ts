import { PUBLIC_PROJECT_STATUSES, type NeedItem, type NeedKind, type ProjectStatus, type ProjectSummary } from './types.ts'

/**
 * Mức đủ nhu cầu của cả dự án, 0–100. Các hạng mục khác đơn vị (phần cơm, nghìn đồng, người) nên không cộng thô số lượng:
 * lấy trung bình tỉ lệ của từng hạng mục, mỗi hạng mục tối đa 100% — dư một món không bù được cho món còn thiếu.
 */
export function needCoverage(needs: readonly NeedItem[]) {
  const ratio = (value: (n: NeedItem) => number) =>
    needs.length === 0 ? 0 : Math.round((needs.reduce((sum, n) => sum + Math.min(1, value(n) / n.targetQty), 0) / needs.length) * 100)
  return {
    committedPct: ratio((n) => n.committedQty),
    confirmedPct: ratio((n) => n.confirmedQty),
    openNeeds: needs.filter((n) => n.committedQty < n.targetQty).length,
  }
}

export const PROJECT_SORTS = ['soon', 'needed', 'newest'] as const
export type ProjectSort = (typeof PROJECT_SORTS)[number]
export const SORT_LABEL: Record<ProjectSort, string> = { soon: 'Sắp diễn ra', needed: 'Còn thiếu nhiều nhất', newest: 'Mới đăng' }
export const PAGE_SIZE = { default: 9, max: 48 } as const

export type ProjectListQuery = {
  q?: string
  status?: ProjectStatus
  kind?: NeedKind
  sort?: ProjectSort
  page?: number
  pageSize?: number
}
/** Số liệu của toàn bộ dự án công khai — không đổi theo bộ lọc hay trang đang xem. */
export type CatalogStats = { open: number; coveragePct: number; confirmedUnits: number; missingNeeds: number }
export type ProjectPage = {
  items: ProjectSummary[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  stats: CatalogStats
}

/** So khớp không phân biệt hoa thường và dấu tiếng Việt: "thu duc" khớp "Thủ Đức". */
export const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase()

export function catalogStats(projects: readonly ProjectSummary[]): CatalogStats {
  const open = projects.filter((p) => p.status === 'published' || p.status === 'in_progress')
  const openNeeds = open.flatMap((p) => p.needs)
  return {
    open: open.length,
    coveragePct: needCoverage(openNeeds).committedPct,
    confirmedUnits: projects.flatMap((p) => p.needs).reduce((sum, n) => sum + n.confirmedQty, 0),
    missingNeeds: openNeeds.filter((n) => n.committedQty < n.targetQty).length,
  }
}

/**
 * Tìm, lọc, sắp xếp và phân trang danh sách công khai. Backend và bản chạy thử cùng gọi hàm này nên trả cùng kết quả.
 * shortcut: lọc trong bộ nhớ trên mọi dự án công khai; chuyển sang truy vấn SQL khi số dự án lên tới hàng nghìn.
 */
export function queryProjects(all: readonly ProjectSummary[], query: ProjectListQuery, today: string): ProjectPage {
  const visible = all.filter((p) => PUBLIC_PROJECT_STATUSES.includes(p.status))
  const needle = fold(query.q?.trim() ?? '')
  const sort = query.sort ?? 'soon'
  const pageSize = query.pageSize ?? PAGE_SIZE.default
  const matches = visible.filter(
    (p) =>
      (!needle || [p.name, p.location, p.beneficiaryGroup].some((field) => fold(field).includes(needle))) &&
      (!query.kind || p.needs.some((n) => n.kind === query.kind)) &&
      // Mặc định ẩn dự án đã huỷ; muốn xem thì lọc đúng trạng thái "Đã huỷ".
      (query.status ? p.status === query.status : p.status !== 'cancelled'),
  )
  const ended = (p: ProjectSummary) => (p.status === 'completed' || p.status === 'cancelled' ? 1 : 0)
  const distance = (p: ProjectSummary) => Math.abs(Date.parse(p.startDate) - Date.parse(today))
  const sorted = [...matches].sort(
    (a, b) =>
      ended(a) - ended(b) ||
      (sort === 'needed'
        ? needCoverage(a.needs).committedPct - needCoverage(b.needs).committedPct
        : sort === 'newest'
          ? b.createdAt.localeCompare(a.createdAt)
          : distance(a) - distance(b)) ||
      // Khoá phụ cố định: cùng điều kiện luôn ra cùng thứ tự, không trùng hay mất dòng giữa các trang.
      a.id.localeCompare(b.id),
  )
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  // Link cũ trỏ quá trang cuối (danh sách đã ngắn đi) thì trả trang cuối thay vì trang rỗng.
  const page = Math.min(Math.max(1, query.page ?? 1), totalPages)
  return {
    items: sorted.slice((page - 1) * pageSize, page * pageSize),
    total: sorted.length,
    page,
    pageSize,
    totalPages,
    stats: catalogStats(visible),
  }
}
