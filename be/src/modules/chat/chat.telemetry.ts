import type { ErrorRequestHandler, RequestHandler } from 'express'
import type { ChatStatus } from '@gomnang/domain/types.ts'
import { log } from '../../infrastructure/logging/logger.ts'
import { PROMPT_VERSION, QUERY_PROMPT_VERSION } from './chat.config.ts'
import type { ChatDeps } from './chat.service.ts'
import * as repository from './chat.telemetry.repository.ts'
import { createChatTimeout, normalizeChatFailure } from './chat.runtime.ts'
// tạo dữ liệu ban đầu 
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
//định nghĩa chatrun type, là kiểu dữ liệu trả về của newChatRun
export type ChatRun = ReturnType<typeof newChatRun>
// bắt đầu ở đây 
/** Chuẩn bị trong RAM; chỉ ghi một bản tổng kết khi response kết thúc. */
export const beginChatRequest = (deps: ChatDeps): RequestHandler => (_req, res, next) => {
  //tạo timeout bằng cách gọi hàm createChatTimeout, lưu signal vào res.locals.chatSignal để dùng sau này
  const timeout = createChatTimeout() // ở đây là 120s
  res.locals.chatSignal = timeout.signal
  //bắt đầu tạo đối tượng để theo dõi thông tin chat, lưu vào res.locals.chatRun để dùng sau này
  const run = newChatRun(deps)
  // res.locals là nơi gắn dữ liệu vào res  để dùng
  res.locals.chatRun = run
  //đăng ký xử lý khi response đóng ( khi res hoàn tất hoặc bị đóng sớm)
  res.once('close', () => {
    // xác định kết quả cuối cùng
    timeout.dispose()
    const outcome = res.locals.chatOutcome as { status: ChatStatus; reasonCode: string } | undefined
    void saveChatRequest(deps, run,
      res.writableFinished && outcome ? outcome.status : 'failed',
      res.writableFinished && outcome ? outcome.reasonCode : 'CHAT_CANCELLED',
      res.writableFinished ? res.statusCode : 499)
      // 3 biến qtrong 
      //status: 'failed'
      //reasonCode: 'CHAT_CANCELLED'
      //httpStatus: 499
      // có 3 TH
      //1. res.writableFinished = true và outcome có giá trị => ghi log với status và reasonCode từ outcome
      //2. res.writableFinished = true và outcome không có giá trị => ghi log với status = failed và reasonCode = CHAT_CANCELLED
      //3. res.writableFinished = false => ghi log với status = failed và reasonCode = CHAT_CANCELLED và httpStatus = 499
  })
  next()
}
// hàm tạo bảng kết quả và lưu vào db
/** Best effort: lỗi log không đổi kết quả chat; không ghi message/stack lỗi DB. */
export async function saveChatRequest(deps: ChatDeps, run: ChatRun, status: ChatStatus, reasonCode: string, httpStatus: number) {
  //Hàm nhận thông tin đang theo dõi và kết quả cuối cùng.
  const finishedAt = new Date()
  // sao chép các thuộc tính của run và thêm các thuộc tính khác 
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
// hàm này được gọi khi có lỗi xảy ra trong quá trình xử lý chat, đặc biệt là khi có lỗi trong controller.answer
// đầu tiên là kiểm tra có dữ liệu run chưa 
// tiếp theo kiểm tra role có bị cấm hay ko (trong history có role là system, developer, admin) => nếu có thì reasonCode = HISTORY_ROLE_FORBIDDEN và status = refused
// chuẩn hóa lỗi bằng hàm normalizeChatFailure => trả về HttpError
// chuẩn lỗi thành //failure.code
                  //failure.status
                  //failure.message
                  //failure.details
//History có role bị cấm.
//Lỗi đã chuẩn hóa có code BAD_REQUEST.
// lưu kết quả vào res.locals.chatOutcome để controller.answer có thể dùng để trả về cho client
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
