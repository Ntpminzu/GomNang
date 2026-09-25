import { z } from 'zod'
export const commitBody = z.object({ needItemId: z.uuid(), quantity: z.number().max(10_000_000) })
export const transitionBody = z.object({ to: z.enum(['delivered', 'confirmed']) })
