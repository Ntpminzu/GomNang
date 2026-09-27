import type { NeedKind } from '@gomnang/domain/types.ts'

export const BENEFICIARY_GROUPS = [
  'Người vô gia cư, người có hoàn cảnh khó khăn tại địa phương',
  'Trẻ em tại mái ấm',
  'Học sinh thiếu điều kiện học tập',
  'Cơ sở bảo trợ xã hội hoặc người cao tuổi neo đơn',
  'Cộng đồng chịu ảnh hưởng thiên tai',
  'Cộng đồng cần cải thiện môi trường sống',
]

/** Đơn vị hay dùng theo loại nhu cầu — gợi ý trong ô đơn vị, vẫn gõ được đơn vị khác. */
export const UNIT_SUGGESTIONS: Record<NeedKind, string[]> = {
  money: ['nghìn đồng'],
  goods: ['phần', 'hộp', 'bộ', 'quyển', 'thùng', 'kg', 'chai', 'đôi', 'cái'],
  labor: ['người', 'ca', 'giờ công'],
  skill: ['buổi', 'người', 'giờ'],
  venue: ['chuyến', 'xe', 'buổi'],
}

type TemplateNeed = { label: string; unit: string; kind: NeedKind; targetQty: number }

/**
 * Mẫu dự án hay gặp ở quy mô phường/trường. Chọn mẫu là điền sẵn nhóm thụ hưởng và danh sách nhu cầu gợi ý;
 * người điều phối chỉ cần sửa số lượng cho đúng thực tế. Số lượng mẫu lấy từ các hoạt động trong dữ liệu mẫu của dự án.
 */
export const PROJECT_TEMPLATES: { id: string; title: string; beneficiaryGroup: string; needs: TemplateNeed[] }[] = [
  {
    id: 'meal',
    title: 'Bữa cơm yêu thương',
    beneficiaryGroup: BENEFICIARY_GROUPS[0],
    needs: [
      { label: 'Suất cơm', unit: 'phần', kind: 'goods', targetQty: 100 },
      { label: 'Nước uống', unit: 'chai', kind: 'goods', targetQty: 100 },
      { label: 'Tình nguyện viên phát cơm', unit: 'người', kind: 'labor', targetQty: 10 },
    ],
  },
  {
    id: 'school',
    title: 'Tiếp sức đến trường',
    beneficiaryGroup: BENEFICIARY_GROUPS[2],
    needs: [
      { label: 'Bộ sách giáo khoa', unit: 'bộ', kind: 'goods', targetQty: 40 },
      { label: 'Vở', unit: 'quyển', kind: 'goods', targetQty: 200 },
      { label: 'Xe chở sách', unit: 'chuyến', kind: 'venue', targetQty: 2 },
    ],
  },
  {
    id: 'cleanup',
    title: 'Dọn vệ sinh môi trường',
    beneficiaryGroup: BENEFICIARY_GROUPS[5],
    needs: [
      { label: 'Tình nguyện viên', unit: 'người', kind: 'labor', targetQty: 25 },
      { label: 'Bao tay', unit: 'đôi', kind: 'goods', targetQty: 30 },
      { label: 'Túi đựng rác', unit: 'cuộn', kind: 'goods', targetQty: 20 },
    ],
  },
  {
    id: 'disaster',
    title: 'Cứu trợ sau thiên tai',
    beneficiaryGroup: BENEFICIARY_GROUPS[4],
    needs: [
      { label: 'Thùng nhu yếu phẩm', unit: 'thùng', kind: 'goods', targetQty: 50 },
      { label: 'Nước sạch', unit: 'thùng', kind: 'goods', targetQty: 50 },
      { label: 'Tiền hỗ trợ trực tiếp', unit: 'nghìn đồng', kind: 'money', targetQty: 10000 },
      { label: 'Xe vận chuyển', unit: 'chuyến', kind: 'venue', targetQty: 3 },
    ],
  },
  {
    id: 'elderly',
    title: 'Thăm người cao tuổi',
    beneficiaryGroup: BENEFICIARY_GROUPS[3],
    needs: [
      { label: 'Phần quà', unit: 'phần', kind: 'goods', targetQty: 30 },
      { label: 'Bác sĩ khám sức khoẻ', unit: 'buổi', kind: 'skill', targetQty: 1 },
      { label: 'Tình nguyện viên', unit: 'người', kind: 'labor', targetQty: 8 },
    ],
  },
]
