import type { ErrorRequestHandler, RequestHandler } from 'express'
import type { ChatStatus } from '@gomnang/domain/types.ts'
import { log } from '../../infrastructure/logging/logger.ts'
import { PROMPT_VERSION, QUERY_PROMPT_VERSION } from './chat.config.ts'
import type { ChatDeps } from './chat.service.ts'
import * as repository from './chat.telemetry.repository.ts'
import { createChatTimeout, normalizeChatFailure } from './chat.runtime.ts'

export function newChatRun(deps: ChatDeps) {
  return {
    requestedProvider: 'ollama' as const,
    requestedModel: deps.model.name,
    actualModel: null as string | null,
    embeddingModel: deps.embedder.model,
    promptVersion: PROMPT_VERSION, queryPromptVersion: QUERY_PROMPT_VERSION,
    origin: null as 'rule' | 'model' | null,
    modelCalls: 0, embeddingCalls: 0,
    inputTokens: null as number | null, outputTokens: null as number | null,
    thinkingTokens: null as number | null, totalTokens: null as number | null,
    embeddingTokens: null as number | null,
    startedAt: new Date(),
  }
}
export type ChatRun = ReturnType<typeof newChatRun>

/** Chuẩn bị trong RAM; chỉ ghi một bản tổng kết khi response kết thúc. */
export const beginChatRequest = (deps: ChatDeps): RequestHandler => (_req, res, next) => {
  const timeout = createChatTimeout()
  res.locals.chatSignal = timeout.signal
  const run = newChatRun(deps)
  res.locals.chatRun = run
  res.once('close', () => {
    timeout.dispose()
    const outcome = res.locals.chatOutcome as { status: ChatStatus; reasonCode: string } | undefined
    void saveChatRequest(deps, run,
      res.writableFinished && outcome ? outcome.status : 'failed',
      res.writableFinished && outcome ? outcome.reasonCode : 'CHAT_CANCELLED',
      res.writableFinished ? res.statusCode : 499)
  })
  next()
}

/** Best effort: lỗi log không đổi kết quả chat; không ghi message/stack lỗi DB. */
export async function saveChatRequest(deps: ChatDeps, run: ChatRun, status: ChatStatus, reasonCode: string, httpStatus: number) {
  const finishedAt = new Date()
  const row = {
    ...run, status, reasonCode, httpStatus, finishedAt,
    latencyMs: Math.max(0, finishedAt.getTime() - run.startedAt.getTime()),
  }
  try {
    await repository.saveRequest(deps.db, row)
  } catch {
    log('error', 'chat metadata unavailable', { ...row, code: 'CHAT_LOG_UNAVAILABLE' })
  }
}

export const chatRequestError: ErrorRequestHandler = (error, req, res, next) => {
  const run = res.locals.chatRun as ChatRun | undefined
  if (!run) { next(error); return }
  const forbiddenRole = Array.isArray(req.body?.history) && req.body.history.some((turn: unknown) => {
    if (!turn || typeof turn !== 'object' || !('role' in turn)) return false
    return typeof turn.role === 'string' && ['system', 'developer', 'admin'].includes(turn.role)
  })
  const failure = normalizeChatFailure(error)
  const status: ChatStatus = forbiddenRole && failure.code === 'BAD_REQUEST' ? 'refused' : 'failed'
  const reasonCode = status === 'refused' ? 'HISTORY_ROLE_FORBIDDEN' : failure.code
  res.locals.chatOutcome = { status, reasonCode }
  if (res.destroyed || res.writableEnded) return
  res.status(failure.status).json({ error: {
    code: failure.code, message: failure.message, details: failure.details,
    promptVersion: run.promptVersion, status, reasonCode,
  } })
}
