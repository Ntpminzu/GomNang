import { inArray, sql } from 'drizzle-orm'
import { DEMO_IDS } from '@gomnang/domain/demo-data.ts'
import type { NeedKind, ProjectStatus, Shift } from '@gomnang/domain/types.ts'
import { loadConfig } from '../src/config/env.ts'
import { openDb } from '../src/infrastructure/database/client.ts'
import { assessments, auditLog, needItems, projects } from '../src/infrastructure/database/schema.ts'

type NeedSeed = {
  label: string
  unit: string
  kind: NeedKind
  targetQty: number
  shift?: Shift
}

type ProjectSeed = {
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
  rejectionReason?: string | null
  report?: string | null
  createdAt: string
  needs: NeedSeed[]
}

const uuid = (prefix: string, n: number) => `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`
const U = DEMO_IDS.users

const shift = (date: string, start: string, end: string, place: string): Shift => ({ date, start, end, place })

const PROJECT_SEEDS: ProjectSeed[] = [
  {
    id: uuid('11000000', 1),
    name: 'Bữa sáng ấm lòng cho bệnh nhi Ung Bướu',
    goal: 'Chuẩn bị 300 suất cháo dinh dưỡng và sữa để hỗ trợ bệnh nhi cùng người chăm sóc trong ba buổi sáng liên tiếp.',
    beneficiaryGroup: 'Bệnh nhi và người nhà có hoàn cảnh khó khăn',
    location: 'Bệnh viện Ung Bướu TP.HCM, cơ sở 2',
    startDate: '2026-10-05',
    endDate: '2026-10-07',
    status: 'published',
    coordinatorId: U.khanh,
    treasurerId: U.mai,
    createdAt: '2026-09-20T01:00:00.000Z',
    needs: [
      { label: 'Cháo dinh dưỡng', unit: 'suất', kind: 'goods', targetQty: 300 },
      { label: 'Kinh phí mua sữa', unit: 'nghìn đồng', kind: 'money', targetQty: 4500 },
      { label: 'Tình nguyện viên phát suất ăn', unit: 'người', kind: 'labor', targetQty: 12, shift: shift('2026-10-05', '05:30', '08:00', 'Cổng khu điều trị ban ngày') },
    ],
  },
  {
    id: uuid('11000000', 2),
    name: 'Áo ấm đến trường cho trẻ em Đồng Văn',
    goal: 'Trao áo khoác, tất và chăn mỏng cho 120 học sinh tiểu học trước đợt rét đầu mùa tại các điểm trường vùng cao.',
    beneficiaryGroup: 'Học sinh tiểu học vùng cao',
    location: 'Huyện Đồng Văn, tỉnh Hà Giang',
    startDate: '2026-11-01',
    endDate: '2026-11-08',
    status: 'published',
    coordinatorId: U.an,
    treasurerId: U.khanh,
    createdAt: '2026-09-21T02:00:00.000Z',
    needs: [
      { label: 'Áo khoác trẻ em', unit: 'chiếc', kind: 'goods', targetQty: 120 },
      { label: 'Chi phí vận chuyển', unit: 'nghìn đồng', kind: 'money', targetQty: 8000 },
      { label: 'Xe tải chở quà', unit: 'chuyến', kind: 'venue', targetQty: 2 },
    ],
  },
  {
    id: uuid('11000000', 3),
    name: 'Bồn nước ngọt cho hộ dân hạn mặn Bến Tre',
    goal: 'Lắp đặt 20 bồn chứa nước và hướng dẫn bảo quản nước sinh hoạt an toàn cho các hộ neo đơn chịu ảnh hưởng xâm nhập mặn.',
    beneficiaryGroup: 'Hộ neo đơn tại vùng hạn mặn',
    location: 'Huyện Ba Tri, tỉnh Bến Tre',
    startDate: '2026-09-24',
    endDate: '2026-10-15',
    status: 'in_progress',
    coordinatorId: U.mai,
    treasurerId: U.an,
    createdAt: '2026-09-12T03:00:00.000Z',
    needs: [
      { label: 'Bồn nhựa 1.000 lít', unit: 'bồn', kind: 'goods', targetQty: 20 },
      { label: 'Kinh phí đường ống và chân đế', unit: 'nghìn đồng', kind: 'money', targetQty: 24000 },
      { label: 'Kỹ thuật viên lắp đặt', unit: 'người', kind: 'skill', targetQty: 5, shift: shift('2026-10-03', '07:00', '16:30', 'UBND xã An Hiệp') },
    ],
  },
  {
    id: uuid('11000000', 4),
    name: 'Thư viện số nhỏ cho học sinh biên giới Tây Ninh',
    goal: 'Trang bị máy tính cũ đã phục hồi, tài khoản học liệu và các buổi hướng dẫn sử dụng Internet an toàn cho học sinh.',
    beneficiaryGroup: 'Học sinh trung học tại xã biên giới',
    location: 'Huyện Tân Biên, tỉnh Tây Ninh',
    startDate: '2026-10-18',
    endDate: '2026-11-15',
    status: 'published',
    coordinatorId: U.tam,
    treasurerId: U.mai,
    createdAt: '2026-09-22T04:00:00.000Z',
    needs: [
      { label: 'Máy tính xách tay đã qua sử dụng', unit: 'máy', kind: 'goods', targetQty: 15 },
      { label: 'Kỹ thuật viên cài đặt và bảo trì', unit: 'người', kind: 'skill', targetQty: 4, shift: shift('2026-10-18', '08:00', '16:00', 'Trường THCS Thạnh Tây') },
      { label: 'Kinh phí thiết bị mạng', unit: 'nghìn đồng', kind: 'money', targetQty: 12000 },
    ],
  },
  {
    id: uuid('11000000', 5),
    name: 'Ngày khám mắt miễn phí cho người cao tuổi',
    goal: 'Khám sàng lọc thị lực, tư vấn chăm sóc mắt và tặng kính đọc sách cho 150 người cao tuổi có hoàn cảnh khó khăn.',
    beneficiaryGroup: 'Người cao tuổi thu nhập thấp',
    location: 'Huyện Củ Chi, TP.HCM',
    startDate: '2026-10-25',
    endDate: '2026-10-25',
    status: 'pending_verification',
    coordinatorId: U.khanh,
    treasurerId: U.an,
    createdAt: '2026-09-26T05:00:00.000Z',
    needs: [
      { label: 'Bác sĩ và kỹ thuật viên khúc xạ', unit: 'người', kind: 'skill', targetQty: 8, shift: shift('2026-10-25', '07:00', '16:00', 'Nhà văn hóa xã Tân Thông Hội') },
      { label: 'Hội trường khám lưu động', unit: 'buổi', kind: 'venue', targetQty: 1 },
      { label: 'Kinh phí làm kính', unit: 'nghìn đồng', kind: 'money', targetQty: 30000 },
    ],
  },
  {
    id: uuid('11000000', 6),
    name: 'Trồng rừng ngập mặn tại Cần Giờ',
    goal: 'Trồng mới 1.000 cây đước non và thu gom rác tại khu phục hồi sinh thái với sự tham gia của cộng đồng địa phương.',
    beneficiaryGroup: 'Cộng đồng ven biển và hệ sinh thái ngập mặn',
    location: 'Xã Long Hòa, huyện Cần Giờ, TP.HCM',
    startDate: '2026-10-17',
    endDate: '2026-10-18',
    status: 'published',
    coordinatorId: U.an,
    treasurerId: U.mai,
    createdAt: '2026-09-18T06:00:00.000Z',
    needs: [
      { label: 'Cây đước giống', unit: 'cây', kind: 'goods', targetQty: 1000 },
      { label: 'Tình nguyện viên trồng cây', unit: 'người', kind: 'labor', targetQty: 60, shift: shift('2026-10-17', '05:30', '11:30', 'Bến đò Long Hòa') },
      { label: 'Xuồng vận chuyển cây giống', unit: 'chuyến', kind: 'venue', targetQty: 6 },
    ],
  },
  {
    id: uuid('11000000', 7),
    name: 'Xe đạp tiếp bước đến trường Quảng Trị',
    goal: 'Trao xe đạp và bộ dụng cụ sửa xe cơ bản cho học sinh phải đi bộ đường dài đến trường mỗi ngày.',
    beneficiaryGroup: 'Học sinh có nguy cơ bỏ học vì đi lại khó khăn',
    location: 'Huyện Đakrông, tỉnh Quảng Trị',
    startDate: '2026-11-20',
    endDate: '2026-11-22',
    status: 'draft',
    coordinatorId: U.mai,
    treasurerId: U.khanh,
    createdAt: '2026-09-27T07:00:00.000Z',
    needs: [
      { label: 'Xe đạp học sinh', unit: 'chiếc', kind: 'goods', targetQty: 30 },
      { label: 'Kinh phí vận chuyển và lắp ráp', unit: 'nghìn đồng', kind: 'money', targetQty: 15000 },
      { label: 'Tình nguyện viên kiểm tra xe', unit: 'người', kind: 'labor', targetQty: 8, shift: shift('2026-11-20', '08:00', '15:00', 'Trường PTDTBT Húc Nghì') },
    ],
  },
  {
    id: uuid('11000000', 8),
    name: 'Sửa mái nhà cho hộ nghèo trước mùa mưa',
    goal: 'Thay mái tôn hư hỏng và gia cố khung nhà cho 10 hộ nghèo, ưu tiên gia đình có trẻ nhỏ hoặc người khuyết tật.',
    beneficiaryGroup: 'Hộ nghèo có nhà xuống cấp',
    location: 'Huyện Bù Đăng, tỉnh Bình Phước',
    startDate: '2026-09-20',
    endDate: '2026-10-20',
    status: 'in_progress',
    coordinatorId: U.khanh,
    treasurerId: U.tam,
    createdAt: '2026-09-08T08:00:00.000Z',
    needs: [
      { label: 'Tôn lợp mái', unit: 'tấm', kind: 'goods', targetQty: 120 },
      { label: 'Thợ xây và thợ hàn', unit: 'người', kind: 'skill', targetQty: 10, shift: shift('2026-10-04', '07:00', '17:00', 'UBND xã Đoàn Kết') },
      { label: 'Kinh phí xà gồ và vít', unit: 'nghìn đồng', kind: 'money', targetQty: 40000 },
    ],
  },
  {
    id: uuid('11000000', 9),
    name: 'Đêm Trung thu cho trẻ em mái ấm An Lạc',
    goal: 'Tổ chức chương trình Trung thu, tặng lồng đèn và học bổng nhỏ cho 80 trẻ em đang được mái ấm chăm sóc.',
    beneficiaryGroup: 'Trẻ em tại mái ấm',
    location: 'Quận Bình Tân, TP.HCM',
    startDate: '2026-09-18',
    endDate: '2026-09-18',
    status: 'completed',
    coordinatorId: U.an,
    treasurerId: U.khanh,
    report: 'Chương trình đã phục vụ đủ 80 em, trao 80 lồng đèn và 20 suất học bổng. Chi phí thực tế thấp hơn dự toán nhờ nhà tài trợ hỗ trợ sân khấu.',
    createdAt: '2026-08-25T09:00:00.000Z',
    needs: [
      { label: 'Lồng đèn', unit: 'chiếc', kind: 'goods', targetQty: 80 },
      { label: 'Kinh phí học bổng', unit: 'nghìn đồng', kind: 'money', targetQty: 20000 },
      { label: 'Hoạt náo viên thiếu nhi', unit: 'người', kind: 'skill', targetQty: 4, shift: shift('2026-09-18', '17:00', '20:30', 'Sân mái ấm An Lạc') },
    ],
  },
  {
    id: uuid('11000000', 10),
    name: 'Gói cứu trợ khẩn cấp cho vùng ngập Nghệ An',
    goal: 'Chuẩn bị các gói nhu yếu phẩm, nước uống và thuốc sát khuẩn cho 250 hộ dân bị cô lập sau mưa lớn.',
    beneficiaryGroup: 'Hộ dân tại khu vực bị ngập sâu',
    location: 'Huyện Kỳ Sơn, tỉnh Nghệ An',
    startDate: '2026-10-02',
    endDate: '2026-10-10',
    status: 'published',
    coordinatorId: U.tam,
    treasurerId: U.an,
    createdAt: '2026-09-28T10:00:00.000Z',
    needs: [
      { label: 'Gói nhu yếu phẩm gia đình', unit: 'gói', kind: 'goods', targetQty: 250 },
      { label: 'Nước uống đóng chai', unit: 'thùng', kind: 'goods', targetQty: 300 },
      { label: 'Xe bán tải vận chuyển', unit: 'chuyến', kind: 'venue', targetQty: 12 },
    ],
  },
  {
    id: uuid('11000000', 11),
    name: 'Lớp tin học cơ bản cho người khiếm thị',
    goal: 'Tổ chức khóa học sáu tuần về đọc màn hình, soạn thảo văn bản và kỹ năng tìm việc trực tuyến cho học viên khiếm thị.',
    beneficiaryGroup: 'Thanh niên khiếm thị đang tìm việc',
    location: 'Quận 3, TP.HCM',
    startDate: '2026-10-12',
    endDate: '2026-11-22',
    status: 'pending_verification',
    coordinatorId: U.mai,
    treasurerId: U.tam,
    createdAt: '2026-09-27T11:00:00.000Z',
    needs: [
      { label: 'Giảng viên công nghệ hỗ trợ tiếp cận', unit: 'người', kind: 'skill', targetQty: 6, shift: shift('2026-10-12', '18:00', '20:30', 'Trung tâm hỗ trợ người khiếm thị') },
      { label: 'Máy tính có phần mềm đọc màn hình', unit: 'máy', kind: 'goods', targetQty: 12 },
      { label: 'Phòng học sáu tuần', unit: 'buổi', kind: 'venue', targetQty: 12 },
    ],
  },
  {
    id: uuid('11000000', 12),
    name: 'Điểm đọc sách cộng đồng ven biển Phú Yên',
    goal: 'Cải tạo một phòng sinh hoạt cũ thành điểm đọc sách miễn phí và tổ chức giờ đọc cuối tuần cho trẻ em làng chài.',
    beneficiaryGroup: 'Trẻ em tại làng chài ven biển',
    location: 'Thị xã Đông Hòa, tỉnh Phú Yên',
    startDate: '2026-12-01',
    endDate: '2026-12-20',
    status: 'draft',
    coordinatorId: U.khanh,
    treasurerId: null,
    createdAt: '2026-09-29T00:30:00.000Z',
    needs: [
      { label: 'Sách thiếu nhi', unit: 'quyển', kind: 'goods', targetQty: 500 },
      { label: 'Kệ sách', unit: 'bộ', kind: 'goods', targetQty: 8 },
      { label: 'Người hướng dẫn giờ đọc', unit: 'người', kind: 'labor', targetQty: 10, shift: shift('2026-12-06', '08:00', '11:00', 'Nhà văn hóa thôn Phú Lạc') },
    ],
  },
  {
    id: uuid('11000000', 13),
    name: 'Ngày hội hiến máu khu công nghệ cao',
    goal: 'Tổ chức tiếp nhận 200 đơn vị máu và truyền thông kiến thức hiến máu an toàn cho người lao động trẻ.',
    beneficiaryGroup: 'Người bệnh cần truyền máu tại TP.HCM',
    location: 'TP. Thủ Đức, TP.HCM',
    startDate: '2026-09-27',
    endDate: '2026-09-27',
    status: 'cancelled',
    coordinatorId: U.tam,
    treasurerId: U.khanh,
    rejectionReason: 'Địa điểm tổ chức đột xuất được trưng dụng cho hoạt động phòng chống thiên tai.',
    createdAt: '2026-09-10T12:00:00.000Z',
    needs: [
      { label: 'Tình nguyện viên điều phối', unit: 'người', kind: 'labor', targetQty: 20, shift: shift('2026-09-27', '06:30', '12:30', 'Nhà văn hóa Khu Công nghệ cao') },
      { label: 'Hội trường và bàn ghế', unit: 'buổi', kind: 'venue', targetQty: 1 },
      { label: 'Suất ăn nhẹ cho người hiến máu', unit: 'suất', kind: 'goods', targetQty: 220 },
    ],
  },
  {
    id: uuid('11000000', 14),
    name: 'Bếp ăn 0 đồng cho lao động khó khăn Đà Nẵng',
    goal: 'Duy trì 200 suất cơm trưa mỗi ngày trong bốn tuần cho lao động tự do và người chăm bệnh có hoàn cảnh khó khăn.',
    beneficiaryGroup: 'Lao động tự do và người chăm bệnh',
    location: 'Quận Hải Châu, TP. Đà Nẵng',
    startDate: '2026-09-15',
    endDate: '2026-10-15',
    status: 'in_progress',
    coordinatorId: U.mai,
    treasurerId: U.khanh,
    createdAt: '2026-09-01T13:00:00.000Z',
    needs: [
      { label: 'Gạo', unit: 'kg', kind: 'goods', targetQty: 1200 },
      { label: 'Kinh phí thực phẩm tươi', unit: 'nghìn đồng', kind: 'money', targetQty: 60000 },
      { label: 'Tình nguyện viên phụ bếp', unit: 'ca', kind: 'labor', targetQty: 80, shift: shift('2026-10-01', '07:00', '12:30', 'Bếp cộng đồng đường Trưng Nữ Vương') },
    ],
  },
  {
    id: uuid('11000000', 15),
    name: 'Đèn năng lượng mặt trời cho đường thôn Ninh Thuận',
    goal: 'Lắp 35 bộ đèn năng lượng mặt trời trên tuyến đường chưa có điện chiếu sáng để người dân đi lại an toàn vào ban đêm.',
    beneficiaryGroup: 'Người dân thôn vùng xa chưa có đèn đường',
    location: 'Huyện Bác Ái, tỉnh Ninh Thuận',
    startDate: '2026-08-10',
    endDate: '2026-09-05',
    status: 'completed',
    coordinatorId: U.khanh,
    treasurerId: U.mai,
    report: 'Đã lắp đủ 35 bộ đèn trên 2,4 km đường thôn. Ban quản lý thôn đã tiếp nhận sơ đồ thiết bị và lịch kiểm tra pin định kỳ.',
    createdAt: '2026-07-28T14:00:00.000Z',
    needs: [
      { label: 'Bộ đèn năng lượng mặt trời', unit: 'bộ', kind: 'goods', targetQty: 35 },
      { label: 'Thợ điện lắp đặt', unit: 'người', kind: 'skill', targetQty: 6, shift: shift('2026-08-15', '06:30', '17:00', 'Nhà sinh hoạt cộng đồng thôn Ma Hoa') },
      { label: 'Xe vận chuyển trụ đèn', unit: 'chuyến', kind: 'venue', targetQty: 4 },
    ],
  },
  {
    id: uuid('11000000', 16),
    name: 'Tủ sách lưu động cho trẻ em Đất Mũi',
    goal: 'Đưa sách thiếu nhi và các buổi đọc truyện lưu động đến bốn điểm trường nhỏ, giúp học sinh vùng xa tiếp cận sách mỗi tuần.',
    beneficiaryGroup: 'Học sinh tiểu học tại khu vực xa trung tâm',
    location: 'Huyện Ngọc Hiển, tỉnh Cà Mau',
    startDate: '2026-10-20',
    endDate: '2026-12-20',
    status: 'published',
    coordinatorId: U.an,
    treasurerId: U.mai,
    createdAt: '2026-09-29T01:00:00.000Z',
    needs: [
      { label: 'Sách truyện thiếu nhi', unit: 'quyển', kind: 'goods', targetQty: 800 },
      { label: 'Tủ sách chống ẩm', unit: 'tủ', kind: 'goods', targetQty: 8 },
      { label: 'Xuồng vận chuyển sách', unit: 'chuyến', kind: 'venue', targetQty: 12 },
    ],
  },
  {
    id: uuid('11000000', 17),
    name: 'Nhà vệ sinh sạch cho điểm trường Kon Plông',
    goal: 'Cải tạo hai khu vệ sinh xuống cấp, bổ sung bồn rửa tay và hướng dẫn học sinh giữ gìn vệ sinh học đường.',
    beneficiaryGroup: 'Học sinh dân tộc thiểu số tại điểm trường vùng cao',
    location: 'Huyện Kon Plông, tỉnh Kon Tum',
    startDate: '2026-09-22',
    endDate: '2026-10-30',
    status: 'in_progress',
    coordinatorId: U.khanh,
    treasurerId: U.an,
    createdAt: '2026-09-05T02:00:00.000Z',
    needs: [
      { label: 'Xi măng và gạch men', unit: 'gói vật tư', kind: 'goods', targetQty: 20 },
      { label: 'Thợ xây và thợ nước', unit: 'người', kind: 'skill', targetQty: 8, shift: shift('2026-10-03', '07:00', '17:00', 'Điểm trường Đăk Tăng') },
      { label: 'Kinh phí thiết bị vệ sinh', unit: 'nghìn đồng', kind: 'money', targetQty: 35000 },
    ],
  },
  {
    id: uuid('11000000', 18),
    name: 'Máy trợ thính cho trẻ em có hoàn cảnh khó khăn',
    goal: 'Khám thính lực và trao máy trợ thính phù hợp cho 25 trẻ em, kèm hướng dẫn sử dụng và lịch tái khám miễn phí.',
    beneficiaryGroup: 'Trẻ em suy giảm thính lực thuộc hộ khó khăn',
    location: 'TP. Huế, thành phố Huế',
    startDate: '2026-11-07',
    endDate: '2026-11-08',
    status: 'published',
    coordinatorId: U.mai,
    treasurerId: U.khanh,
    createdAt: '2026-09-25T03:00:00.000Z',
    needs: [
      { label: 'Máy trợ thính', unit: 'máy', kind: 'goods', targetQty: 25 },
      { label: 'Chuyên viên thính học', unit: 'người', kind: 'skill', targetQty: 6, shift: shift('2026-11-07', '07:30', '16:30', 'Trung tâm Y tế TP. Huế') },
      { label: 'Phòng khám và đo thính lực', unit: 'ngày', kind: 'venue', targetQty: 2 },
    ],
  },
  {
    id: uuid('11000000', 19),
    name: 'Cầu dân sinh qua kênh nội đồng An Giang',
    goal: 'Xây cầu bê tông nhỏ thay cầu gỗ xuống cấp, giúp người dân và học sinh đi lại an toàn trong mùa nước nổi.',
    beneficiaryGroup: 'Người dân và học sinh tại khu vực nông thôn',
    location: 'Huyện Tri Tôn, tỉnh An Giang',
    startDate: '2026-11-15',
    endDate: '2027-01-15',
    status: 'pending_verification',
    coordinatorId: U.an,
    treasurerId: U.khanh,
    createdAt: '2026-09-28T04:00:00.000Z',
    needs: [
      { label: 'Kinh phí vật liệu xây dựng', unit: 'nghìn đồng', kind: 'money', targetQty: 180000 },
      { label: 'Kỹ sư giám sát công trình', unit: 'người', kind: 'skill', targetQty: 2, shift: shift('2026-11-15', '07:00', '16:00', 'Ấp Tân Lợi, xã Tân Tuyến') },
      { label: 'Ngày công hỗ trợ', unit: 'ngày công', kind: 'labor', targetQty: 80, shift: shift('2026-11-16', '07:00', '16:30', 'Công trường cầu Tân Lợi') },
    ],
  },
  {
    id: uuid('11000000', 20),
    name: 'Làm sạch bãi biển và phục hồi rạn san hô Quy Nhơn',
    goal: 'Thu gom rác ven biển, phân loại chất thải và hỗ trợ nhóm chuyên môn đặt giá thể phục hồi san hô tại vùng nước phù hợp.',
    beneficiaryGroup: 'Cộng đồng ngư dân và hệ sinh thái biển',
    location: 'TP. Quy Nhơn, tỉnh Bình Định',
    startDate: '2026-10-24',
    endDate: '2026-10-25',
    status: 'published',
    coordinatorId: U.khanh,
    treasurerId: U.mai,
    createdAt: '2026-09-24T05:00:00.000Z',
    needs: [
      { label: 'Tình nguyện viên dọn bãi biển', unit: 'người', kind: 'labor', targetQty: 100, shift: shift('2026-10-24', '05:30', '10:30', 'Bãi biển Nhơn Hải') },
      { label: 'Chuyên gia sinh thái biển', unit: 'người', kind: 'skill', targetQty: 5, shift: shift('2026-10-25', '06:00', '14:00', 'Bến tàu Nhơn Hải') },
      { label: 'Bao tay và bao phân loại rác', unit: 'bộ', kind: 'goods', targetQty: 120 },
    ],
  },
  {
    id: uuid('11000000', 21),
    name: 'Học bổng tiếp sức cho học sinh mồ côi Sóc Trăng',
    goal: 'Hỗ trợ học phí, đồng phục và dụng cụ học tập trong một năm học cho học sinh mồ côi có kết quả học tập tốt.',
    beneficiaryGroup: 'Học sinh mồ côi có nguy cơ nghỉ học',
    location: 'Huyện Mỹ Xuyên, tỉnh Sóc Trăng',
    startDate: '2026-11-01',
    endDate: '2027-05-31',
    status: 'draft',
    coordinatorId: U.mai,
    treasurerId: null,
    createdAt: '2026-09-29T06:00:00.000Z',
    needs: [
      { label: 'Quỹ học bổng', unit: 'nghìn đồng', kind: 'money', targetQty: 100000 },
      { label: 'Bộ đồng phục học sinh', unit: 'bộ', kind: 'goods', targetQty: 40 },
      { label: 'Tình nguyện viên theo dõi học tập', unit: 'người', kind: 'labor', targetQty: 10, shift: shift('2026-11-01', '08:00', '11:00', 'Nhà văn hóa huyện Mỹ Xuyên') },
    ],
  },
  {
    id: uuid('11000000', 22),
    name: 'Xưởng sửa xe lăn miễn phí cho người khuyết tật',
    goal: 'Kiểm tra, sửa chữa và thay phụ tùng cơ bản cho 60 xe lăn nhằm bảo đảm việc di chuyển an toàn cho người sử dụng.',
    beneficiaryGroup: 'Người khuyết tật vận động có thu nhập thấp',
    location: 'TP. Biên Hòa, tỉnh Đồng Nai',
    startDate: '2026-09-26',
    endDate: '2026-10-10',
    status: 'in_progress',
    coordinatorId: U.an,
    treasurerId: U.mai,
    createdAt: '2026-09-15T07:00:00.000Z',
    needs: [
      { label: 'Kỹ thuật viên sửa xe lăn', unit: 'người', kind: 'skill', targetQty: 10, shift: shift('2026-10-03', '08:00', '16:30', 'Trung tâm bảo trợ xã hội Đồng Nai') },
      { label: 'Bộ phụ tùng thay thế', unit: 'bộ', kind: 'goods', targetQty: 60 },
      { label: 'Nhà xưởng và bàn sửa chữa', unit: 'ngày', kind: 'venue', targetQty: 4 },
    ],
  },
  {
    id: uuid('11000000', 23),
    name: 'Loa cảnh báo lũ sớm cho bản vùng cao Yên Bái',
    goal: 'Lắp đặt hệ thống loa cảnh báo và tập huấn phương án sơ tán cho các hộ dân ở khu vực có nguy cơ lũ quét cao.',
    beneficiaryGroup: 'Hộ dân sống gần suối và vùng có nguy cơ sạt lở',
    location: 'Huyện Mù Cang Chải, tỉnh Yên Bái',
    startDate: '2026-08-15',
    endDate: '2026-09-15',
    status: 'completed',
    coordinatorId: U.khanh,
    treasurerId: U.an,
    report: 'Đã lắp 12 cụm loa tại bốn bản và tổ chức hai buổi diễn tập sơ tán với 186 hộ dân tham gia. Thiết bị được bàn giao cho tổ phòng chống thiên tai xã.',
    createdAt: '2026-08-01T08:00:00.000Z',
    needs: [
      { label: 'Cụm loa cảnh báo dùng năng lượng mặt trời', unit: 'cụm', kind: 'goods', targetQty: 12 },
      { label: 'Kỹ thuật viên viễn thông', unit: 'người', kind: 'skill', targetQty: 4, shift: shift('2026-08-20', '07:00', '17:00', 'UBND xã Hồ Bốn') },
      { label: 'Kinh phí dây dẫn và trụ lắp', unit: 'nghìn đồng', kind: 'money', targetQty: 28000 },
    ],
  },
  {
    id: uuid('11000000', 24),
    name: 'Bữa cơm sum vầy cho người vô gia cư dịp Tết',
    goal: 'Chuẩn bị bữa cơm, túi nhu yếu phẩm và hỗ trợ chuyến xe về quê cho người vô gia cư cùng lao động khó khăn.',
    beneficiaryGroup: 'Người vô gia cư và lao động không có điều kiện về quê',
    location: 'Quận Ninh Kiều, TP. Cần Thơ',
    startDate: '2027-02-04',
    endDate: '2027-02-05',
    status: 'published',
    coordinatorId: U.mai,
    treasurerId: U.an,
    createdAt: '2026-09-28T09:00:00.000Z',
    needs: [
      { label: 'Suất cơm tất niên', unit: 'suất', kind: 'goods', targetQty: 400 },
      { label: 'Kinh phí vé xe về quê', unit: 'nghìn đồng', kind: 'money', targetQty: 50000 },
      { label: 'Tình nguyện viên phục vụ', unit: 'người', kind: 'labor', targetQty: 30, shift: shift('2027-02-04', '14:00', '21:00', 'Nhà văn hóa quận Ninh Kiều') },
    ],
  },
  {
    id: uuid('11000000', 25),
    name: 'Ngày hội đổi rác tái chế lấy cây xanh',
    goal: 'Thu gom rác tái chế từ hộ dân, đổi lấy cây xanh và hướng dẫn phân loại rác tại nguồn cho cộng đồng chung cư.',
    beneficiaryGroup: 'Cư dân đô thị và môi trường cộng đồng',
    location: 'Quận Hoàng Mai, TP. Hà Nội',
    startDate: '2026-10-04',
    endDate: '2026-10-04',
    status: 'cancelled',
    coordinatorId: U.an,
    treasurerId: U.khanh,
    rejectionReason: 'Khu vực tổ chức đang sửa chữa hệ thống thoát nước và chưa thể bảo đảm an toàn tập trung đông người.',
    createdAt: '2026-09-16T10:00:00.000Z',
    needs: [
      { label: 'Cây xanh để bàn', unit: 'chậu', kind: 'goods', targetQty: 500 },
      { label: 'Tình nguyện viên phân loại rác', unit: 'người', kind: 'labor', targetQty: 25, shift: shift('2026-10-04', '07:00', '12:00', 'Sân sinh hoạt cộng đồng Linh Đàm') },
      { label: 'Khu vực tập kết và cân rác', unit: 'buổi', kind: 'venue', targetQty: 1 },
    ],
  },
]

function statusHistory(seed: ProjectSeed) {
  const states: ProjectStatus[] = ['draft']
  if (seed.status !== 'draft') states.push('pending_verification')
  if (!['draft', 'pending_verification'].includes(seed.status)) states.push('published')
  if (['in_progress', 'completed'].includes(seed.status)) states.push('in_progress')
  if (seed.status === 'completed') states.push('completed')
  if (seed.status === 'cancelled') states.push('cancelled')
  return states
}

const config = loadConfig()
const { db, close } = await openDb(config.dataDir, config.databaseUrl)

try {
  const seedIds = PROJECT_SEEDS.map((project) => project.id)
  const existing = await db.select({ id: projects.id }).from(projects).where(inArray(projects.id, seedIds))
  const existingIds = new Set(existing.map((row) => row.id))
  const missing = PROJECT_SEEDS.filter((project) => !existingIds.has(project.id))

  if (missing.length === 0) {
    console.log(`${PROJECT_SEEDS.length} dự án bổ sung đã tồn tại; không tạo bản sao.`)
  } else {
    await db.transaction(async (tx) => {
      await tx.insert(projects).values(missing.map(({ needs: _needs, ...project }) => ({
        ...project,
        rejectionReason: project.rejectionReason ?? null,
        report: project.report ?? null,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.createdAt),
      })))

      await tx.insert(needItems).values(missing.flatMap((project) =>
        project.needs.map((need, position) => ({
          id: uuid('21000000', (PROJECT_SEEDS.indexOf(project) + 1) * 10 + position + 1),
          projectId: project.id,
          label: need.label,
          unit: need.unit,
          kind: need.kind,
          targetQty: need.targetQty,
          position,
          shift: need.shift ?? null,
        })),
      ))

      const reviewable = missing.filter((project) => project.status !== 'draft')
      if (reviewable.length > 0) {
        await tx.insert(assessments).values(reviewable.map((project) => ({
          id: uuid('51000000', PROJECT_SEEDS.indexOf(project) + 1),
          projectId: project.id,
          source: 'rules' as const,
          verdict: 'PASS' as const,
          signals: [],
          similarProjects: [],
          createdAt: new Date(new Date(project.createdAt).getTime() + 60 * 60 * 1000),
        })))
      }

      await tx.insert(auditLog).values(missing.flatMap((project) => {
        const projectNumber = PROJECT_SEEDS.indexOf(project) + 1
        return statusHistory(project).map((state, index, states) => ({
          id: uuid('41000000', projectNumber * 10 + index + 1),
          projectId: project.id,
          entityType: 'project' as const,
          entityId: project.id,
          fromState: index === 0 ? null : states[index - 1],
          toState: state,
          actorId: state === 'published' ? U.tam : project.coordinatorId,
          reason: state === 'cancelled' ? project.rejectionReason ?? null : null,
          at: new Date(new Date(project.createdAt).getTime() + index * 60 * 60 * 1000),
        }))
      }))
    })

    console.log(`Đã thêm ${missing.length} dự án, ${missing.reduce((sum, project) => sum + project.needs.length, 0)} nhu cầu và lịch sử liên quan.`)
  }

  const [totals] = await db.select({
    projects: sql<number>`count(distinct ${projects.id})::int`,
  }).from(projects)
  console.log(`Tổng số dự án trong database: ${totals.projects}`)
} finally {
  await close()
}
