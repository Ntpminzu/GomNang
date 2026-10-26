import { z } from 'zod'

const message = z.string().trim().min(1).max(1000)
export const chatBody = z.strictObject({
  message,
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(3000),
  })).max(8).default([]),
})
export type ChatInput = z.output<typeof chatBody>
