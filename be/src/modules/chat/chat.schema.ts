import { z } from 'zod'
// các schema được dùng để validate input của các API chat
// message: câu hỏi chat, history: lịch sử chat trước đó (role + content)
//message dài tối đa 1000 ký tự, content tối đa 3000 ký tự, history tối đa 8 turn
const message = z.string().trim().min(1).max(1000)
//strick object: không cho phép có các key khác ngoài role và content
export const chatBody = z.strictObject({
  message,
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(3000),
  })).max(8).default([]),
})
export type ChatInput = z.output<typeof chatBody>
