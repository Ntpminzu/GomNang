import { isMockMode } from '../config/env.ts'
import { request } from './client.ts'
import { ApiError } from './errors.ts'
import type { ChatModelInfo, ChatReply, ChatRequest } from '@gomnang/domain/types.ts'

export type { ChatTurn } from '@gomnang/domain/types.ts'

export function getChatModel(): Promise<ChatModelInfo | null> {
  if (isMockMode) return Promise.resolve(null)
  return request<ChatModelInfo>('/api/chat/model', { anonymous: true })
}

export function askChat(message: string, history: NonNullable<ChatRequest['history']>): Promise<ChatReply> {
  if (isMockMode) {
    throw new ApiError(503, 'CHAT_REQUIRES_BACKEND', 'Trợ lý cần backend và Ollama đang chạy. Hãy chuyển sang chế độ HTTP.')
  }
  return request<ChatReply>('/api/chat', {
    method: 'POST',
    body: { message, history: history.slice(-8).map((turn) => ({ ...turn, content: turn.content.slice(0, 3000) })) } satisfies ChatRequest,
    anonymous: true,
    timeoutMs: 130_000,
  })
}
