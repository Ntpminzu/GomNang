import { z } from 'zod'
export const reviewBody = z.object({ decision: z.enum(['approve', 'reject']), reason: z.string().trim().max(1000).optional() })
// Từ US-7 app chỉ còn một model chat (Ollama); trường `model` giữ cho client cũ, chỉ nhận 'ollama'.
export const aiAssessmentBody = z.object({ model: z.literal('ollama').default('ollama') })
export type AiAssessmentInput = z.output<typeof aiAssessmentBody>
