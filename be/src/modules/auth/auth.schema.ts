import { z } from 'zod'
import { truncates } from 'bcryptjs'
export const passwordValue = z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').refine((v) => !truncates(v), 'Mật khẩu không được vượt quá 72 byte UTF-8.')
export const loginBody = z.object({ email: z.email() })

export const registerBody = z
  .object({
    name: z.string().trim().min(2, 'Tên tối thiểu 2 ký tự').max(100),
    phone: z.string().trim().regex(/^0\d{9}$/, 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0'),
    email: z.string().trim().email('Email không hợp lệ').transform((v) => v.toLowerCase()),
    password: passwordValue,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  })

export const loginPasswordBody = z.object({
  email: z.string().trim().email('Email không hợp lệ').transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})
export const changePasswordBody = z.object({ currentPassword: z.string().min(1), newPassword: passwordValue, confirmPassword: z.string() })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Mật khẩu xác nhận không khớp.' })
