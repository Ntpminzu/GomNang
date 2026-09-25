import { Router, type RequestHandler } from 'express'
import { inputOf, validateBody } from '../../common/middleware/validation.ts'
import { chatBody, type ChatInput } from './chat.schema.ts'
import { answerChat, listChatModels, type ChatDeps } from './chat.service.ts'

export function chatRoutes(deps: ChatDeps, auth: RequestHandler) {
  const router = Router()
  router.get('/api/chat/models', (_req, res) => res.json(listChatModels(deps.models)))
  router.post('/api/chat', validateBody(chatBody), (req, res, next) => {
    if (inputOf<ChatInput>(res).model === 'gemini') return auth(req, res, next)
    next()
  }, async (_req, res) => {
    res.json(await answerChat(deps, inputOf<ChatInput>(res)))
  })
  return router
}
