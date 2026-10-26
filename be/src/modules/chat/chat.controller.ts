import type { RequestHandler } from 'express'
import { inputOf } from '../../common/middleware/validation.ts'
import type { ChatInput } from './chat.schema.ts'
import * as service from './chat.service.ts'
import type { ChatDeps } from './chat.service.ts'
import { finishChatRequest, type ChatRun } from './chat.telemetry.ts'
import type { ChatDeadline } from './chat.runtime.ts'

export const models = (deps: ChatDeps): RequestHandler => (_req, res) => {
  res.json(service.listChatModels(deps.models))
}

export const answer = (deps: ChatDeps): RequestHandler => async (_req, res) => {
  const run = res.locals.chatRun as ChatRun
  const deadline = res.locals.chatDeadline as ChatDeadline
  const reply = await deadline.run(() => service.answerQuestion(deps, inputOf<ChatInput>(res), run, deadline))
  await finishChatRequest(deps, run, reply.status, reply.reasonCode, 200, deadline)
  res.locals.chatLogCompleted = true
  deadline.check(true)
  res.json(reply)
}
