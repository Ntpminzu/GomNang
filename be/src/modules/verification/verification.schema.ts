import { z } from 'zod'
export const reviewBody = z.object({ decision: z.enum(['approve', 'reject']), reason: z.string().trim().max(1000).optional() })
