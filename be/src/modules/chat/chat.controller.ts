import type { RequestHandler } from 'express'
import type { ChatModelInfo } from '@gomnang/domain/types.ts'
import { inputOf } from '../../common/middleware/validation.ts'
import type { ChatInput } from './chat.schema.ts'
import * as service from './chat.service.ts'
import type { ChatDeps } from './chat.service.ts'
import type { ChatRun } from './chat.telemetry.ts'
import { withAbort } from './chat.runtime.ts'

export const model = (deps: ChatDeps): RequestHandler => (_req, res) => {
  res.json({ name: deps.model.name, available: deps.model.client !== null } satisfies ChatModelInfo)
}

export const answer = (deps: ChatDeps): RequestHandler => async (_req, res) => {
  const run = res.locals.chatRun as ChatRun
  const signal = res.locals.chatSignal as AbortSignal
  const reply = await withAbort(signal, () => service.answerQuestion(deps, inputOf<ChatInput>(res), run, signal))
  res.locals.chatOutcome = { status: reply.status, reasonCode: reply.reasonCode }
  res.json(reply)
}
