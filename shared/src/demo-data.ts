import type { AssessmentRow, AuditRow, ContributionRow, NeedRow, ProjectRow, UserRow } from './types.ts'

/**
 * Dữ liệu mẫu dùng chung.
 *   - Backend nạp vào PostgreSQL khi database còn trống (backend/src/db/seed.ts).
 *   - Mock của frontend nạp vào localStorage (frontend/lib/api.ts).
 * Hai phía cùng một bộ dữ liệu, cùng mã UUID, nên request mẫu trong docs/api-contract.md
 * chạy lại được y hệt trên mọi máy.
 *
 * Toàn bộ là dữ liệu giả, không có thông tin của người thật.
 */

const uuid = (prefix: string, n: number) => `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`

export const DEMO_IDS = {
  users: {
    khanh: uuid('00000000', 1),
    an: uuid('00000000', 2),
    mai: uuid('00000000', 3),
    hung: uuid('00000000', 4),
    tam: uuid('00000000', 5),
  },
  projects: {
    hoaMai: uuid('10000000', 1),
    sachGiaoKhoa: uuid('10000000', 2),
    boKenh: uuid('10000000', 3),
  },
  needs: {
    com: uuid('20000000', 1),
    sua: uuid('20000000', 2),
    gas: uuid('20000000', 3),
    sgk: uuid('20000000', 4),
    vo: uuid('20000000', 5),
    xeCho: uuid('20000000', 6),
    tinhNguyenVien: uuid('20000000', 7),
    baoTay: uuid('20000000', 8),
  },
} as const

const U = DEMO_IDS.users
const P = DEMO_IDS.projects
const N = DEMO_IDS.needs

export const DEMO_USERS: UserRow[] = [
  { id: U.khanh, email: 'khanh@gomnang.test', displayName: 'Võ Tuấn Khanh', verified: true, isVerifier: false },
  { id: U.an, email: 'an@gomnang.test', displayName: 'Phạm Văn Bảo An', verified: true, isVerifier: false },
  { id: U.mai, email: 'mai@gomnang.test', displayName: 'Nguyễn Thị Mai', verified: true, isVerifier: false },
  { id: U.hung, email: 'hung@gomnang.test', displayName: 'Trần Văn Hùng', verified: false, isVerifier: false },
  { id: U.tam, email: 'tam@gomnang.test', displayName: 'Lê Minh Tâm', verified: true, isVerifier: true },
]

export const DEMO_PROJECTS: ProjectRow[] = [
  {
    id: P.hoaMai,
    name: '100 phần cơm cho mái ấm Hoa Mai',
    goal: 'Nấu và phát 100 phần cơm trưa cùng 100 hộp sữa cho trẻ em tại mái ấm Hoa Mai trong ngày sinh hoạt cuối tháng.',
    beneficiaryGroup: 'Trẻ em tại mái ấm',
    location: 'Phường Linh Trung, TP. Thủ Đức',
    startDate: '2026-09-26',
    endDate: '2026-09-26',
    status: 'published',
    coordinatorId: U.khanh,
    treasurerId: U.mai,
    rejectionReason: null,
    createdAt: '2026-09-05T02:12:00.000Z',
  },
  {
    id: P.sachGiaoKhoa,
    name: 'Sách giáo khoa cũ cho học sinh phường Linh Trung',
    goal: 'Thu gom, phân loại và trao 40 bộ sách giáo khoa cùng 200 quyển vở cho học sinh tiểu học có hoàn cảnh khó khăn.',
    beneficiaryGroup: 'Học sinh thiếu điều kiện học tập',
    location: 'Phường Linh Trung, TP. Thủ Đức',
    startDate: '2026-09-20',
    endDate: '2026-10-04',
    status: 'in_progress',
    coordinatorId: U.an,
    treasurerId: null,
    rejectionReason: null,
    createdAt: '2026-09-01T03:00:00.000Z',
  },
  {
    id: P.boKenh,
    name: 'Dọn vệ sinh bờ kênh khu phố 6',
    goal: 'Huy động 25 tình nguyện viên dọn rác và cắt cỏ dọc 400m bờ kênh, kết hợp tuyên truyền phân loại rác cho hộ dân ven kênh.',
    beneficiaryGroup: 'Cộng đồng cần cải thiện môi trường sống',
    location: 'Khu phố 6, Phường Hiệp Bình Chánh',
    startDate: '2026-10-11',
    endDate: '2026-10-11',
    status: 'pending_verification',
    coordinatorId: U.mai,
    treasurerId: null,
    rejectionReason: null,
    createdAt: '2026-09-10T14:14:00.000Z',
  },
]

export const DEMO_NEEDS: NeedRow[] = [
  { id: N.com, projectId: P.hoaMai, label: 'Cơm', unit: 'phần', kind: 'goods', targetQty: 100, position: 0 },
  { id: N.sua, projectId: P.hoaMai, label: 'Sữa', unit: 'hộp', kind: 'goods', targetQty: 100, position: 1 },
  { id: N.gas, projectId: P.hoaMai, label: 'Chi phí gas và gia vị', unit: 'nghìn đồng', kind: 'money', targetQty: 800, position: 2 },
  { id: N.sgk, projectId: P.sachGiaoKhoa, label: 'Bộ sách giáo khoa', unit: 'bộ', kind: 'goods', targetQty: 40, position: 0 },
  { id: N.vo, projectId: P.sachGiaoKhoa, label: 'Vở', unit: 'quyển', kind: 'goods', targetQty: 200, position: 1 },
  { id: N.xeCho, projectId: P.sachGiaoKhoa, label: 'Xe chở sách', unit: 'chuyến', kind: 'venue', targetQty: 2, position: 2 },
  { id: N.tinhNguyenVien, projectId: P.boKenh, label: 'Tình nguyện viên', unit: 'người', kind: 'labor', targetQty: 25, position: 0 },
  { id: N.baoTay, projectId: P.boKenh, label: 'Bao tay', unit: 'đôi', kind: 'goods', targetQty: 30, position: 1 },
]

const C = (n: number) => uuid('30000000', n)

export const DEMO_CONTRIBUTIONS: ContributionRow[] = [
  { id: C(1), projectId: P.hoaMai, needItemId: N.com, contributorId: U.an, quantity: 30, status: 'confirmed', createdAt: '2026-09-07T10:00:00.000Z' },
  { id: C(2), projectId: P.hoaMai, needItemId: N.com, contributorId: U.mai, quantity: 40, status: 'committed', createdAt: '2026-09-07T11:30:00.000Z' },
  { id: C(3), projectId: P.hoaMai, needItemId: N.sua, contributorId: U.hung, quantity: 50, status: 'delivered', createdAt: '2026-09-08T01:00:00.000Z' },
  { id: C(4), projectId: P.hoaMai, needItemId: N.gas, contributorId: U.mai, quantity: 300, status: 'confirmed', createdAt: '2026-09-08T02:00:00.000Z' },
  { id: C(5), projectId: P.sachGiaoKhoa, needItemId: N.vo, contributorId: U.khanh, quantity: 200, status: 'confirmed', createdAt: '2026-09-04T02:00:00.000Z' },
  { id: C(6), projectId: P.sachGiaoKhoa, needItemId: N.sgk, contributorId: U.hung, quantity: 20, status: 'delivered', createdAt: '2026-09-05T02:00:00.000Z' },
]

export const DEMO_ASSESSMENTS: AssessmentRow[] = [
  { id: uuid('50000000', 1), projectId: P.hoaMai, source: 'rules', verdict: 'PASS', signals: [], similarProjects: [], createdAt: '2026-09-06T07:03:00.000Z' },
  { id: uuid('50000000', 2), projectId: P.sachGiaoKhoa, source: 'rules', verdict: 'PASS', signals: [], similarProjects: [], createdAt: '2026-09-02T09:00:00.000Z' },
  { id: uuid('50000000', 3), projectId: P.boKenh, source: 'rules', verdict: 'PASS', signals: [], similarProjects: [], createdAt: '2026-09-11T01:02:00.000Z' },
]

let auditSeq = 0
const audit = (
  projectId: string,
  at: string,
  actorId: string,
  entityType: AuditRow['entityType'],
  entityId: string,
  fromState: string | null,
  toState: string,
): AuditRow => ({ id: uuid('40000000', ++auditSeq), projectId, at, actorId, entityType, entityId, fromState, toState, reason: null })

export const DEMO_AUDIT: AuditRow[] = [
  audit(P.hoaMai, '2026-09-05T02:12:00.000Z', U.khanh, 'project', P.hoaMai, null, 'draft'),
  audit(P.hoaMai, '2026-09-06T07:03:00.000Z', U.khanh, 'project', P.hoaMai, 'draft', 'pending_verification'),
  audit(P.hoaMai, '2026-09-07T01:40:00.000Z', U.tam, 'project', P.hoaMai, 'pending_verification', 'published'),
  audit(P.hoaMai, '2026-09-07T10:00:00.000Z', U.an, 'contribution', C(1), null, 'committed'),
  audit(P.hoaMai, '2026-09-07T11:30:00.000Z', U.mai, 'contribution', C(2), null, 'committed'),
  audit(P.hoaMai, '2026-09-08T01:00:00.000Z', U.hung, 'contribution', C(3), null, 'committed'),
  audit(P.hoaMai, '2026-09-08T02:00:00.000Z', U.mai, 'contribution', C(4), null, 'committed'),
  audit(P.hoaMai, '2026-09-08T12:22:00.000Z', U.an, 'contribution', C(1), 'committed', 'delivered'),
  audit(P.hoaMai, '2026-09-08T13:00:00.000Z', U.mai, 'contribution', C(4), 'committed', 'delivered'),
  audit(P.hoaMai, '2026-09-09T00:55:00.000Z', U.mai, 'contribution', C(1), 'delivered', 'confirmed'),
  audit(P.hoaMai, '2026-09-09T01:10:00.000Z', U.khanh, 'contribution', C(4), 'delivered', 'confirmed'),
  audit(P.hoaMai, '2026-09-09T08:00:00.000Z', U.hung, 'contribution', C(3), 'committed', 'delivered'),
  audit(P.sachGiaoKhoa, '2026-09-01T03:00:00.000Z', U.an, 'project', P.sachGiaoKhoa, null, 'draft'),
  audit(P.sachGiaoKhoa, '2026-09-02T09:00:00.000Z', U.an, 'project', P.sachGiaoKhoa, 'draft', 'pending_verification'),
  audit(P.sachGiaoKhoa, '2026-09-03T09:30:00.000Z', U.tam, 'project', P.sachGiaoKhoa, 'pending_verification', 'published'),
  audit(P.sachGiaoKhoa, '2026-09-04T02:00:00.000Z', U.khanh, 'contribution', C(5), null, 'committed'),
  audit(P.sachGiaoKhoa, '2026-09-04T09:00:00.000Z', U.khanh, 'contribution', C(5), 'committed', 'delivered'),
  audit(P.sachGiaoKhoa, '2026-09-04T10:00:00.000Z', U.an, 'contribution', C(5), 'delivered', 'confirmed'),
  audit(P.sachGiaoKhoa, '2026-09-05T02:00:00.000Z', U.hung, 'contribution', C(6), null, 'committed'),
  audit(P.sachGiaoKhoa, '2026-09-06T02:00:00.000Z', U.hung, 'contribution', C(6), 'committed', 'delivered'),
  audit(P.sachGiaoKhoa, '2026-09-10T02:00:00.000Z', U.an, 'project', P.sachGiaoKhoa, 'published', 'in_progress'),
  audit(P.boKenh, '2026-09-10T14:14:00.000Z', U.mai, 'project', P.boKenh, null, 'draft'),
  audit(P.boKenh, '2026-09-11T01:02:00.000Z', U.mai, 'project', P.boKenh, 'draft', 'pending_verification'),
]
