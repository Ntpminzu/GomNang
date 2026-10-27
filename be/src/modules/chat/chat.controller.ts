import type { RequestHandler } from 'express'
import type { ChatModelInfo } from '@gomnang/domain/types.ts'
import { inputOf } from '../../common/middleware/validation.ts'
import type { ChatInput } from './chat.schema.ts'
import * as service from './chat.service.ts'
import type { ChatDeps } from './chat.service.ts'
import type { ChatRun } from './chat.telemetry.ts'
import { withAbort } from './chat.runtime.ts'
// lấy model từ deps và trả về thông tin model, bao gồm tên và trạng thái khả dụng
export const model = (deps: ChatDeps): RequestHandler => (_req, res) => {
  res.json({ name: deps.model.name, available: deps.model.client !== null } satisfies ChatModelInfo)
}
// trả về câu trả lời chat, gọi service.answerQuestion để lấy câu trả lời
export const answer = (deps: ChatDeps): RequestHandler => async (_req, res) => {
 // run tạo từ chatrun ở chat.telemetry.ts, 
 //signal tạo từ createChatTimeout ở chat.runtime.ts
 // ở đây sẽ tạo thêm reply bằng cách gọi hàm service.answerQuestion, chuyển run và signal vào để theo dõi thông tin chat
 // run đc truyền xuống service để theo dõi số lượng token, số lượng gọi model, model thực tế được gọi, và 
 // signal đc chuyển xuống để có thể hủy gọi model nếu hết thời gian 
 
 const run = res.locals.chatRun as ChatRun
  const signal = res.locals.chatSignal as AbortSignal 
  //withAbort: gọi service.answerQuestion với signal, nếu signal bị abort thì throw lỗi
  const reply = await withAbort(signal, () => service.answerQuestion(deps, inputOf<ChatInput>(res), run, signal))
  //Dòng lưu kết quả để ghi log
  // ví dụ res.locals.chatOutcome = {
  //status: reply.status,
  //reasonCode: reply.reasonCode,
  //}
  // . Nó lưu thông tin để middleware telemetry dùng khi response đóng.
  //
  res.locals.chatOutcome = { status: reply.status, reasonCode: reply.reasonCode }
  
  res.json(reply)
  // sau tất cả lúc này ChatReply chứa
//   {
//   reply,
//   sources,
//   generatedByModel,
//   status,
//   reasonCode,
//   promptVersion,
// }
}
