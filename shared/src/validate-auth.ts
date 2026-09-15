import type { FieldErrors } from './validate-project.ts'

/**
 * Quy tắc hợp lệ của đăng ký và đăng nhập — dùng chung cho trình duyệt và máy chủ, như validate-project.ts.
 *
 * Chỉ kiểm giá trị người dùng nhập. Email đã có tài khoản chưa, mật khẩu đúng hay sai là việc của máy chủ.
 */

export const DISPLAY_NAME_MIN = 2
export const DISPLAY_NAME_MAX = 80
export const EMAIL_MAX = 254
/** 8 ký tự: mức tối thiểu NIST SP 800-63B đặt cho mật khẩu do người dùng tự chọn. */
export const PASSWORD_MIN = 8
/** Chặn trên để một request không bắt máy chủ băm một chuỗi dài hàng megabyte. */
export const PASSWORD_MAX = 128

export type RegisterInput = { displayName: string; email: string; password: string }
export type LoginInput = { email: string; password: string }

// Đủ để bắt lỗi gõ nhầm: thiếu @, thiếu tên miền, có dấu cách. Email có thật hay không chỉ biết khi gửi thư — chưa làm.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Email không phân biệt hoa thường, bỏ khoảng trắng hai đầu. Lưu và tra cứu đều phải đi qua hàm này. */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase()

function emailError(email: string): string | undefined {
  const value = email.trim()
  if (!value) return 'Email là bắt buộc.'
  if (value.length > EMAIL_MAX || !EMAIL_PATTERN.test(value)) return 'Email chưa đúng dạng, ví dụ ten@gmail.com.'
  return undefined
}

export function validateRegistration(input: RegisterInput): FieldErrors {
  const errors: FieldErrors = {}

  const name = input.displayName.trim()
  if (!name) errors.displayName = 'Tên hiển thị là bắt buộc.'
  else if (name.length < DISPLAY_NAME_MIN || name.length > DISPLAY_NAME_MAX)
    errors.displayName = `Tên hiển thị cần từ ${DISPLAY_NAME_MIN} đến ${DISPLAY_NAME_MAX} ký tự.`

  const email = emailError(input.email)
  if (email) errors.email = email

  // Mật khẩu không cắt khoảng trắng: dấu cách cũng là một ký tự người dùng cố ý gõ.
  if (!input.password) errors.password = 'Mật khẩu là bắt buộc.'
  else if (input.password.length < PASSWORD_MIN) errors.password = `Mật khẩu cần ít nhất ${PASSWORD_MIN} ký tự.`
  else if (input.password.length > PASSWORD_MAX) errors.password = `Mật khẩu dài tối đa ${PASSWORD_MAX} ký tự.`

  return errors
}

/** Đăng nhập không áp độ dài tối thiểu — chỉ kiểm có nhập, để thông báo sai mật khẩu luôn đến từ máy chủ. */
export function validateLogin(input: LoginInput): FieldErrors {
  const errors: FieldErrors = {}

  const email = emailError(input.email)
  if (email) errors.email = email

  if (!input.password) errors.password = 'Nhập mật khẩu.'
  else if (input.password.length > PASSWORD_MAX) errors.password = `Mật khẩu dài tối đa ${PASSWORD_MAX} ký tự.`

  return errors
}
