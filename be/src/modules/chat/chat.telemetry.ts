import { randomUUID } from 'node:crypto'
import type { ErrorRequestHandler, RequestHandler } from 'express'
import type { ChatProvider, ChatStatus } from '@gomnang/domain/types.ts'
import { HttpError } from '../../common/errors/http-error.ts'
import { log } from '../../infrastructure/logging/logger.ts'
import { PROMPT_VERSION, QUERY_PROMPT_VERSION } from './chat.config.ts'
import type { ChatDeps } from './chat.service.ts'
import * as repository from './chat.telemetry.repository.ts'
import { ChatDeadline, normalizeChatFailure } from './chat.runtime.ts'

export function newChatRun(deps: ChatDeps, provider: ChatProvider | null, requestId: string = randomUUID()) {
  return {
    id: randomUUID(), requestId, requestedProvider: provider,
    requestedModel: provider ? deps.models[provider].name : null,
    actualModel: null as string | null,
    embeddingModel: deps.embedder.model,
    promptVersion: PROMPT_VERSION, queryPromptVersion: QUERY_PROMPT_VERSION,
    origin: null as 'rule' | 'model' | null,
    modelCalls: 0, embeddingCalls: 0, embeddedDocuments: 0,
    inputTokens: null as number | null, outputTokens: null as number | null,
    thinkingTokens: null as number | null, totalTokens: null as number | null,
    startedAt: new Date(),
  }
}
export type ChatRun = ReturnType<typeof newChatRun>

function logUnavailable(run: ChatRun) {
  // Không ghi lỗi Drizzle: message/stack có thể chứa SQL và dữ liệu đầu vào.
  log('error', 'chat metadata unavailable', { requestId: run.requestId, logId: run.id, code: 'CHAT_LOG_UNAVAILABLE' })
  return new HttpError(503, 'CHAT_LOG_UNAVAILABLE', 'Không lưu được trạng thái yêu cầu AI. Vui lòng thử lại sau.')
}

/** Chạy sau express.json, trước validation/auth; JSON hỏng chỉ có HTTP request log. */
export const beginChatRequest = (deps: ChatDeps): RequestHandler => async (req, res, next) => {
  const deadline = new ChatDeadline()
  res.locals.chatDeadline = deadline
  res.once('finish', () => deadline.dispose())
  res.once('close', () => deadline.dispose())
  const value: unknown = req.body?.model
  const provider = value === undefined || value === 'ollama' ? 'ollama' : null
  const run = newChatRun(deps, provider, res.locals.requestId)
  res.locals.chatRun = run
  try { await deadline.run(() => repository.beginRequest(deps.db, run)) } catch (error) {
    if (error instanceof HttpError && ['CHAT_TIMEOUT', 'CHAT_CANCELLED'].includes(error.code)) throw error
    throw logUnavailable(run)
  }
  res.locals.chatLogStarted = true
  next()
}

export async function finishChatRequest(deps: ChatDeps, run: ChatRun, status: ChatStatus, reasonCode: string, httpStatus: number, deadline?: ChatDeadline) {
  const finishedAt = new Date()
  try {
    const save = () => repository.completeRequest(deps.db, run.id, {
      ...run, lifecycle: 'completed', status, reasonCode, httpStatus, finishedAt,
      latencyMs: Math.max(0, finishedAt.getTime() - run.startedAt.getTime()),
    })
    await (deadline ? deadline.run(save, true) : save())
  } catch (error) {
    if (error instanceof HttpError && ['CHAT_TIMEOUT', 'CHAT_CANCELLED'].includes(error.code)) {
      log('warn', 'chat metadata incomplete', { requestId: run.requestId, logId: run.id, code: error.code })
      throw error
    }
    throw logUnavailable(run)
  }
}

export const chatRequestError = (deps: ChatDeps): ErrorRequestHandler => async (error, req, res, next) => {
  const run = res.locals.chatRun as ChatRun | undefined
  if (!run) { next(error); return }
  const forbiddenRole = Array.isArray(req.body?.history) && req.body.history.some((turn: unknown) => {
    if (!turn || typeof turn !== 'object' || !('role' in turn)) return false
    return typeof turn.role === 'string' && ['system', 'developer', 'admin'].includes(turn.role)
  })
  const deadline = res.locals.chatDeadline as ChatDeadline | undefined
  let failure = normalizeChatFailure(error)
  let status: ChatStatus = forbiddenRole && failure.code === 'BAD_REQUEST' ? 'refused' : 'failed'
  let reasonCode = status === 'refused' ? 'HISTORY_ROLE_FORBIDDEN' : failure.code
  if (res.locals.chatLogStarted && !res.locals.chatLogCompleted && failure.code !== 'CHAT_LOG_UNAVAILABLE' && !deadline?.total.signal.aborted) {
    try { await finishChatRequest(deps, run, status, reasonCode, failure.status, deadline) } catch (loggingError) {
      failure = loggingError as HttpError
      status = 'failed'
      reasonCode = failure.code
    }
  }
  if (res.destroyed || res.writableEnded) return
  res.status(failure.status).json({ error: {
    code: failure.code, message: failure.message, details: failure.details,
    requestId: run.requestId, promptVersion: run.promptVersion, status, reasonCode,
  } })
}
