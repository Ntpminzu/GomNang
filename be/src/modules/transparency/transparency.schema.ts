import { z } from 'zod'
export const updateBody = z.object({ body: z.string().max(2000) })
export const expenseBody = z.object({
  needItemId: z.uuid(),
  amount: z.number().max(1_000_000_000),
  description: z.string().max(500),
  receiptUrl: z.string().max(500).optional(),
})
export const expenseReviewBody = z.object({ decision: z.enum(['approve', 'reject']), reason: z.string().max(1000).optional() })
