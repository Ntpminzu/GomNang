import { SHIFT_KINDS, type ProjectInput } from './types.ts'

/**
 * Quy tắc hợp lệ của một dự án (US-1) — dùng chung cho trình duyệt và máy chủ.
 *
 * Hàm thuần: không đụng DOM, database hay đồng hồ hệ thống. Mọi thứ phụ thuộc bên ngoài
 * (ngày hôm nay, ai đang thao tác, người phụ trách tài chính đã xác minh chưa) đều được
 * truyền vào qua `ctx`, nên test cho kết quả giống nhau ở mọi thời điểm chạy.
 *
 * Ở trình duyệt hàm này chỉ để báo lỗi sớm. Máy chủ gọi lại đúng hàm này trước khi ghi
 * dữ liệu — client không bao giờ là chốt chặn.
 */

export type FieldErrors = Record<string, string>

export type ValidationContext = {
  /** Ngày hôm nay dạng YYYY-MM-DD. */
  today: string
  /** Người điều phối, cũng là người đang tạo hoặc sửa dự án. */
  coordinatorId: string
  /** `false` khi người phụ trách tài chính không tồn tại hoặc chưa xác minh. Bỏ trống khi chưa tra cứu. */
  treasurerVerified?: boolean
}

/** Ngày hôm nay theo giờ Việt Nam dạng YYYY-MM-DD, không phụ thuộc múi giờ của máy đang chạy. */
export function todayInVietnam(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now)
}

export const MIN_NAME_LENGTH = 8
export const MIN_GOAL_LENGTH = 20
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export function validateProject(input: ProjectInput, ctx: ValidationContext): FieldErrors {
  const errors: FieldErrors = {}

  const name = input.name.trim()
  if (!name) errors.name = 'Tên dự án là bắt buộc.'
  else if (name.length < MIN_NAME_LENGTH)
    errors.name = `Tên dự án cần ít nhất ${MIN_NAME_LENGTH} ký tự để người đọc biết dự án làm gì.`

  const goal = input.goal.trim()
  if (!goal) errors.goal = 'Mục tiêu là bắt buộc.'
  else if (goal.length < MIN_GOAL_LENGTH)
    errors.goal = `Mục tiêu cần ít nhất ${MIN_GOAL_LENGTH} ký tự. Tránh viết chung chung như "giúp bà con khó khăn".`

  if (!input.beneficiaryGroup.trim()) errors.beneficiaryGroup = 'Cần nêu nhóm thụ hưởng.'

  if (!input.location.trim())
    errors.location = 'Cần nêu địa điểm cụ thể — chỉ ghi tên quận là chưa đủ để người đóng góp tới nơi.'

  if (!input.startDate) errors.startDate = 'Chọn ngày bắt đầu.'
  else if (input.startDate < ctx.today) errors.startDate = 'Ngày bắt đầu không được ở quá khứ.'

  if (!input.endDate) errors.endDate = 'Chọn ngày kết thúc.'
  else if (input.startDate && input.endDate < input.startDate)
    errors.endDate = 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.'

  if (input.needItems.length === 0) {
    errors.needItems = 'Cần ít nhất một hạng mục nhu cầu — người đóng góp phải biết dự án đang thiếu gì.'
  }

  input.needItems.forEach((item, i) => {
    if (!item.label.trim()) errors[`needItems.${i}.label`] = 'Nhập tên hạng mục.'
    if (!item.unit.trim()) errors[`needItems.${i}.unit`] = 'Nhập đơn vị: phần, hộp, người...'
    if (!Number.isInteger(item.targetQty) || item.targetQty <= 0)
      errors[`needItems.${i}.targetQty`] = 'Số lượng phải là số nguyên lớn hơn 0.'

    const shift = item.shift
    if (!shift) return
    if (!SHIFT_KINDS.includes(item.kind)) {
      errors[`needItems.${i}.shift`] = 'Chỉ nhu cầu công sức hoặc kỹ năng mới có ca làm việc.'
      return
    }
    if (!DATE.test(shift.date)) errors[`needItems.${i}.shiftDate`] = 'Chọn ngày của ca.'
    else if ((input.startDate && shift.date < input.startDate) || (input.endDate && shift.date > input.endDate))
      errors[`needItems.${i}.shiftDate`] = 'Ngày của ca phải nằm trong thời gian dự án.'
    if (!TIME.test(shift.start) || !TIME.test(shift.end)) errors[`needItems.${i}.shiftTime`] = 'Nhập giờ bắt đầu và kết thúc.'
    else if (shift.end <= shift.start) errors[`needItems.${i}.shiftTime`] = 'Giờ kết thúc phải sau giờ bắt đầu.'
    if (shift.place.trim().length < 3)
      errors[`needItems.${i}.shiftPlace`] = 'Ghi điểm tập kết cụ thể để tình nguyện viên tìm tới.'
  })

  // BR-002 và BR-003 — đặc tả bài toán §9.1.
  const treasurerId = input.treasurerId || null
  const hasMoneyItem = input.needItems.some((item) => item.kind === 'money')

  if (hasMoneyItem && !treasurerId) {
    errors.treasurerId =
      'BR-002: dự án có hạng mục bằng tiền bắt buộc phải có người phụ trách tài chính đã được xác minh.'
  } else if (treasurerId && treasurerId === ctx.coordinatorId) {
    errors.treasurerId =
      'BR-003: người phụ trách tài chính không được là người điều phối. Người giữ tiền không được tự xác nhận toàn bộ quy trình thu chi.'
  } else if (treasurerId && ctx.treasurerVerified === false) {
    errors.treasurerId = 'BR-002: người phụ trách tài chính phải là thành viên đã được xác minh danh tính.'
  }

  return errors
}
