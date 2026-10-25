import { z } from 'zod'
import { passwordValue } from '../auth/auth.schema.ts'
export const createVerifierBody = z.strictObject({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  phone: z.string().regex(/^0\d{9}$/).optional(),
  password: passwordValue,
  confirmPassword: z.string(),
}).refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Mật khẩu xác nhận không khớp.' })
