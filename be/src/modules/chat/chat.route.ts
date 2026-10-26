import { Router } from 'express'
import { validateBody } from '../../common/middleware/validation.ts'
import { chatBody } from './chat.schema.ts'
import type { ChatDeps } from './chat.service.ts'
import * as controller from './chat.controller.ts'
import { beginChatRequest, chatRequestError } from './chat.telemetry.ts'

export function chatRoutes(deps: ChatDeps) {
  const router = Router()
  router.get('/api/chat/models', controller.models(deps))
  router.post('/api/chat', beginChatRequest(deps), validateBody(chatBody), controller.answer(deps))
  router.use('/api/chat', chatRequestError(deps))
  return router
}
