import { Router } from 'express'
import { validateBody } from '../../common/middleware/validation.ts'
import { chatBody } from './chat.schema.ts'
import type { ChatDeps } from './chat.service.ts'
import * as controller from './chat.controller.ts'
import { beginChatRequest, chatRequestError } from './chat.telemetry.ts'

export function chatRoutes(deps: ChatDeps) {
  const router = Router()
  // lấy thông tin model chat
  router.get('/api/chat/model', controller.model(deps))
  // gửi câu hỏi chat và nhận câu trả lời       
  router.post('/api/chat', beginChatRequest(deps), validateBody(chatBody), controller.answer(deps))
  router.use('/api/chat', chatRequestError)
  return router
}
