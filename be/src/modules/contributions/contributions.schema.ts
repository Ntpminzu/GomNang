import { z } from 'zod'
export const commitBody = z.object({ needItemId: z.uuid(), quantity: z.number().max(10_000_000) })
// note: ghi chú khi bàn giao ("đã giao tận tay chị Lan lúc 9h") hoặc lý do huỷ — lưu vào sổ ghi vết.
export const transitionBody = z.object({ to: z.enum(['delivered', 'confirmed', 'cancelled']), note: z.string().max(500).optional() })
