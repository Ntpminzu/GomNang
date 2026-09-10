import type { Member, ProjectDetail } from './types.ts'

/**
 * Dữ liệu giả cho Homework 3A. Không có thông tin của người thật.
 * Tuần 4 sẽ thay bằng dữ liệu từ API — chỉ cần đổi phần thân hàm trong lib/api.ts,
 * các màn hình không phải sửa gì.
 */

export const MOCK_MEMBERS: Member[] = [
  { id: 'u1', name: 'Võ Tuấn Khanh', verified: true },
  { id: 'u2', name: 'Phạm Văn Bảo An', verified: true },
  { id: 'u3', name: 'Nguyễn Thị Mai', verified: true },
  { id: 'u4', name: 'Trần Văn Hùng', verified: false },
]

/** Người đang đăng nhập (tuần 3 hard-code, tuần 4 lấy từ Supabase Auth). */
export const CURRENT_USER_ID = 'u1'

export const MOCK_PROJECTS: ProjectDetail[] = [
  {
    id: 'p1',
    name: '100 phần cơm cho mái ấm Hoa Mai',
    status: 'published',
    goal: 'Nấu và phát 100 phần cơm trưa cùng 100 hộp sữa cho trẻ em tại mái ấm Hoa Mai trong ngày sinh hoạt cuối tháng.',
    beneficiaryGroup: 'Trẻ em tại mái ấm',
    location: 'Phường Linh Trung, TP. Thủ Đức',
    startDate: '2026-09-26',
    endDate: '2026-09-26',
    coordinatorName: 'Võ Tuấn Khanh',
    treasurerName: 'Nguyễn Thị Mai',
    needs: [
      { id: 'n1', label: 'Cơm', unit: 'phần', kind: 'goods', targetQty: 100, committedQty: 70, deliveredQty: 30 },
      { id: 'n2', label: 'Sữa', unit: 'hộp', kind: 'goods', targetQty: 100, committedQty: 50, deliveredQty: 0 },
      { id: 'n3', label: 'Chi phí gas và gia vị', unit: 'nghìn đồng', kind: 'money', targetQty: 800, committedQty: 300, deliveredQty: 300 },
    ],
    contributions: [
      { id: 'c1', contributorName: 'Phạm Văn Bảo An', needLabel: 'Cơm', quantity: 30, unit: 'phần', status: 'confirmed' },
      { id: 'c2', contributorName: 'Nguyễn Thị Mai', needLabel: 'Cơm', quantity: 40, unit: 'phần', status: 'committed' },
      { id: 'c3', contributorName: 'Trần Văn Hùng', needLabel: 'Sữa', quantity: 50, unit: 'hộp', status: 'delivered' },
      { id: 'c4', contributorName: 'Nguyễn Thị Mai', needLabel: 'Chi phí gas và gia vị', quantity: 300, unit: 'nghìn đồng', status: 'confirmed' },
    ],
    auditLog: [
      { id: 'a1', at: '2026-09-05 09:12', actorName: 'Võ Tuấn Khanh', entity: 'Dự án', fromState: null, toState: 'Bản nháp' },
      { id: 'a2', at: '2026-09-06 14:03', actorName: 'Võ Tuấn Khanh', entity: 'Dự án', fromState: 'Bản nháp', toState: 'Chờ xác minh' },
      { id: 'a3', at: '2026-09-07 08:40', actorName: 'Phạm Văn Bảo An', entity: 'Dự án', fromState: 'Chờ xác minh', toState: 'Đang kêu gọi' },
      { id: 'a4', at: '2026-09-08 19:22', actorName: 'Phạm Văn Bảo An', entity: 'Đóng góp #c1', fromState: 'Đã cam kết', toState: 'Đã bàn giao' },
      { id: 'a5', at: '2026-09-09 07:55', actorName: 'Nguyễn Thị Mai', entity: 'Đóng góp #c1', fromState: 'Đã bàn giao', toState: 'Đã xác nhận' },
    ],
  },
  {
    id: 'p2',
    name: 'Sách giáo khoa cũ cho học sinh phường Linh Trung',
    status: 'in_progress',
    goal: 'Thu gom, phân loại và trao 40 bộ sách giáo khoa cùng 200 quyển vở cho học sinh tiểu học có hoàn cảnh khó khăn.',
    beneficiaryGroup: 'Học sinh thiếu điều kiện học tập',
    location: 'Phường Linh Trung, TP. Thủ Đức',
    startDate: '2026-09-20',
    endDate: '2026-10-04',
    coordinatorName: 'Phạm Văn Bảo An',
    treasurerName: null,
    needs: [
      { id: 'n4', label: 'Bộ sách giáo khoa', unit: 'bộ', kind: 'goods', targetQty: 40, committedQty: 20, deliveredQty: 10 },
      { id: 'n5', label: 'Vở', unit: 'quyển', kind: 'goods', targetQty: 200, committedQty: 200, deliveredQty: 200 },
      { id: 'n6', label: 'Xe chở sách', unit: 'chuyến', kind: 'venue', targetQty: 2, committedQty: 1, deliveredQty: 0 },
    ],
    contributions: [
      { id: 'c5', contributorName: 'Võ Tuấn Khanh', needLabel: 'Vở', quantity: 200, unit: 'quyển', status: 'confirmed' },
      { id: 'c6', contributorName: 'Trần Văn Hùng', needLabel: 'Bộ sách giáo khoa', quantity: 20, unit: 'bộ', status: 'delivered' },
    ],
    auditLog: [
      { id: 'a6', at: '2026-09-01 10:00', actorName: 'Phạm Văn Bảo An', entity: 'Dự án', fromState: null, toState: 'Bản nháp' },
      { id: 'a7', at: '2026-09-03 16:30', actorName: 'Võ Tuấn Khanh', entity: 'Dự án', fromState: 'Chờ xác minh', toState: 'Đang thực hiện' },
    ],
  },
  {
    id: 'p3',
    name: 'Dọn vệ sinh bờ kênh khu phố 6',
    status: 'pending_verification',
    goal: 'Huy động 25 tình nguyện viên dọn rác và cắt cỏ dọc 400m bờ kênh, kết hợp tuyên truyền phân loại rác cho hộ dân ven kênh.',
    beneficiaryGroup: 'Cộng đồng cần cải thiện môi trường sống',
    location: 'Khu phố 6, Phường Hiệp Bình Chánh',
    startDate: '2026-10-11',
    endDate: '2026-10-11',
    coordinatorName: 'Nguyễn Thị Mai',
    treasurerName: null,
    needs: [
      { id: 'n7', label: 'Tình nguyện viên', unit: 'người', kind: 'labor', targetQty: 25, committedQty: 12, deliveredQty: 0 },
      { id: 'n8', label: 'Bao tay', unit: 'đôi', kind: 'goods', targetQty: 30, committedQty: 0, deliveredQty: 0 },
    ],
    contributions: [],
    auditLog: [
      { id: 'a8', at: '2026-09-10 21:14', actorName: 'Nguyễn Thị Mai', entity: 'Dự án', fromState: null, toState: 'Bản nháp' },
      { id: 'a9', at: '2026-09-11 08:02', actorName: 'Nguyễn Thị Mai', entity: 'Dự án', fromState: 'Bản nháp', toState: 'Chờ xác minh' },
    ],
  },
]
