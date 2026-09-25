import { isMockMode } from '../config/env.ts'
import { request } from './client.ts'
import { ApiError } from './errors.ts'
import type { ChatModelOption, ChatProvider, ChatReply, ChatRequest } from '@gomnang/domain/types.ts'

export type { ChatTurn } from '@gomnang/domain/types.ts'

export function listChatModels(): Promise<ChatModelOption[]> {
  if (isMockMode) return Promise.resolve([])
  return request<ChatModelOption[]>('/api/chat/models', { anonymous: true })
}

export function askChat(message: string, history: NonNullable<ChatRequest['history']>, model: ChatProvider): Promise<ChatReply> {
  if (isMockMode) {
    throw new ApiError(503, 'CHAT_REQUIRES_BACKEND', 'Trợ lý cần backend và Ollama đang chạy. Hãy chuyển sang chế độ HTTP.')
  }
  return request<ChatReply>('/api/chat', {
    method: 'POST',
    body: { message, model, history: history.slice(-8).map((turn) => ({ ...turn, content: turn.content.slice(0, 3000) })) } satisfies ChatRequest,
    anonymous: model === 'ollama',
    timeoutMs: 130_000,
  })
}
