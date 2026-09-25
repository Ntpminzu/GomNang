import { z } from 'zod'
export const loginBody = z.object({ email: z.email() })

export const registerBody = z
  .object({
    name: z.string().trim().min(2, 'Tên tối thiểu 2 ký tự').max(100),
    phone: z.string().trim().regex(/^0\d{9}$/, 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0'),
    email: z.string().trim().email('Email không hợp lệ').transform((v) => v.toLowerCase()),
    password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
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
