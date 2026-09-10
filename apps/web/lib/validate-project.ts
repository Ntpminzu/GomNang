import type { NeedKind } from './types.ts'

/**
 * Kiểm tra form tạo dự án (US-1).
 *
 * Hàm thuần: không đụng DOM, không đụng React, không đọc ngày hệ thống —
 * `today` được truyền vào để test chạy ra kết quả giống nhau ở mọi thời điểm.
 *
 * Tuần 4 sẽ dùng lại đúng bộ quy tắc này ở backend. Validate phía trình duyệt
 * chỉ để báo lỗi sớm cho người dùng, KHÔNG phải là chốt chặn an ninh —
 * xem slide "Never trust the client to enforce access control".
 */

export type NeedItemInput = {
  label: string
  unit: string
  kind: NeedKind
  targetQty: string
}

export type ProjectFormInput = {
  name: string
  goal: string
  beneficiaryGroup: string
  location: string
  startDate: string
  endDate: string
  coordinatorId: string
  treasurerId: string
  needItems: NeedItemInput[]
}

/** Khoá lỗi: tên trường, hoặc `needItems.<chỉ số>.<tên trường>` cho hạng mục nhu cầu. */
export type FieldErrors = Record<string, string>

export const MIN_NAME_LENGTH = 8
export const MIN_GOAL_LENGTH = 20

export function validateProjectForm(input: ProjectFormInput, today: string): FieldErrors {
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
  else if (input.startDate < today) errors.startDate = 'Ngày bắt đầu không được ở quá khứ.'

  if (!input.endDate) errors.endDate = 'Chọn ngày kết thúc.'
  else if (input.startDate && input.endDate < input.startDate)
    errors.endDate = 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.'

  if (input.needItems.length === 0) {
    errors.needItems = 'Cần ít nhất một hạng mục nhu cầu — người đóng góp phải biết dự án đang thiếu gì.'
  }

  input.needItems.forEach((item, i) => {
    if (!item.label.trim()) errors[`needItems.${i}.label`] = 'Nhập tên hạng mục.'
    if (!item.unit.trim()) errors[`needItems.${i}.unit`] = 'Nhập đơn vị: phần, hộp, người...'

    const raw = item.targetQty.trim()
    const qty = Number(raw)
    if (!raw) errors[`needItems.${i}.targetQty`] = 'Nhập số lượng mục tiêu.'
    else if (!Number.isFinite(qty) || qty <= 0)
      errors[`needItems.${i}.targetQty`] = 'Số lượng phải là một số lớn hơn 0.'
  })

  // BR-002 và BR-003 trong đặc tả bài toán §9.1 — đây là quy tắc nghiệp vụ,
  // không phải kiểm tra trường trống, nên phải kiểm cả ở backend từ tuần 4.
  const hasMoneyItem = input.needItems.some((item) => item.kind === 'money')
  if (hasMoneyItem) {
    if (!input.treasurerId) {
      errors.treasurerId =
        'BR-002: dự án có hạng mục bằng tiền bắt buộc phải có người phụ trách tài chính đã được xác minh.'
    } else if (input.treasurerId === input.coordinatorId) {
      errors.treasurerId =
        'BR-003: người phụ trách tài chính không được là người điều phối. Người giữ tiền không được tự xác nhận toàn bộ quy trình thu chi.'
    }
  }

  return errors
}
