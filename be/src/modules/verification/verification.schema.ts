import { z } from 'zod'
export const reviewBody = z.object({ decision: z.enum(['approve', 'reject']), reason: z.string().trim().max(1000).optional() })
export const aiAssessmentBody = z.object({ model: z.enum(['ollama', 'gemini']).default('ollama') })
export type AiAssessmentInput = z.output<typeof aiAssessmentBody>
