import type { ChatReply } from '@gomnang/domain/types.ts'
import { HttpError } from '../../common/errors/http-error.ts'
import type { Db } from '../../infrastructure/database/client.ts'
import type { ChatInput } from './chat.schema.ts'
import type { ConfiguredChatModel } from './chat.model.ts'
import type { ChatEmbedder } from './chat.embedding.ts'
import { retrieve } from './chat.retrieval.ts'
import { selectHistory, isFollowUpQuestion, buildRetrievalQuestion, buildMessages } from './chat.rag.ts'
import { PROMPT_VERSION } from './chat.config.ts'
import { parseChatOutput, validateChatAnswer } from './chat.output.ts'
import { newChatRun, type ChatRun } from './chat.telemetry.ts'
import { filterSafeChatSources, GUARD_REPLIES, inspectChatInput } from './chat.guard.ts'

export type ChatDeps = {
  db: Db
  model: ConfiguredChatModel
  embedder: ChatEmbedder
}

export const NO_CHAT_EVIDENCE = 'Mình chưa tìm thấy nguồn công khai đủ để trả lời câu hỏi này. Bạn có thể xem trang Dự án hoặc hỏi cụ thể hơn.'
const MODEL_REFUSAL = 'Mình chưa thể trả lời yêu cầu này trong phạm vi nguồn công khai của GomNang. Bạn có thể hỏi cụ thể về dự án hoặc cách sử dụng website.'

export async function answerQuestion(deps: ChatDeps, input: ChatInput, run: ChatRun = newChatRun(deps), signal?: AbortSignal): Promise<ChatReply> {
  // Kiểm tra xem signal có bị hủy không, nếu có thì ném ra lỗi
  signal?.throwIfAborted()
  // base là lưu thông tin phiên bản pronmt version và query promt version
  const base = { promptVersion: PROMPT_VERSION }
  // Kiểm tra xem input bằng hàm inspectChatInput có vấn đề gì không, nếu có thì trả về phản hồi từ GUARD_REPLIES
  const inputIssue = inspectChatInput(input.message, input.history)
  // Nếu input có vấn đề, cập nhật run.origin thành 'rule' và trả về phản hồi từ GUARD_REPLIES
  if (inputIssue) {
    run.origin = 'rule'
    return { ...base, reply: GUARD_REPLIES[inputIssue], sources: [], generatedByModel: false, status: 'refused', reasonCode: inputIssue }
  // GUARD_REPLIES: các câu trả lời có sẵn ứng với từng lý do từ chối.
  }
  // nếu ổn sẽ lấy client từ deps.model.client, nếu client = null => throw lỗi 503
  const client = deps.model.client
  if (!client) throw new HttpError(503, 'CHAT_MODEL_UNAVAILABLE', 'Model này chưa được cấu hình trên máy chủ.')
  //xác định câu hỏi có đang tiếp nối hội thoại trước ko
  // còn hàm selectHistory sẽ lấy ra các tin nhắn trước đó để làm bộ nhớ cho model, nếu không phải tiếp nối => history = []
  const history = isFollowUpQuestion(input.message) ? selectHistory(input.history) : []
  // sau khi đã có history, sẽ tạo retrievalQuestion bằng hàm buildRetrievalQuestion, dùng để truy vấn và lấy các nguồn liên quan
  // Tạo câu hỏi phục vụ tìm kiếm
  // gọi hàm buildRetrievalQuestion với input là history và câu hỏi người dùng
  const retrievalQuestion = buildRetrievalQuestion(input.message, history) 
  // sau khi có đc câu hỏi đủ ngữ cảnh , // sẽ tạo embedder mới từ deps.embedder, để theo dõi số lượng gọi embed và số lượng token embed
  const embedder: ChatEmbedder = {
    ...deps.embedder,
    async embedQuery(question, options) {
      // kiểm tra signal có bị abort chưa, nếu có => throw lỗi
      signal?.throwIfAborted()
      // nếu chưa +1
      run.embeddingCalls += 1
      // theo dõi số lượng token embed
      //reult là kết quả trả về của sau khi embend , sẽ gồm số lượng token và vector
      const result = await deps.embedder.embedQuery(question, options)
      if (result.tokens !== null) run.embeddingTokens = (run.embeddingTokens ?? 0) + result.tokens
      return result
    },
  }
  // sau khi có embedder, sẽ gọi retrieve để lấy các tài liệu liên quan, nếu không có nguồn => trả về NO_CHAT_EVIDENCE
  const candidates = await retrieve(deps.db, embedder, retrievalQuestion, undefined, undefined, signal)
  // sau khi có candidates, sẽ lọc ra các nguồn an toàn bằng filterSafeChatSources, nếu không có nguồn an toàn => trả về NO_CHAT_EVIDENCE
  const { sources, excluded } = filterSafeChatSources(candidates)
  if (sources.length === 0) {
    run.origin = 'rule'
    return { ...base, reply: excluded > 0 ? GUARD_REPLIES.UNSAFE_SOURCES : NO_CHAT_EVIDENCE, sources: [], generatedByModel: false,
      status: 'refused', reasonCode: excluded > 0 ? 'UNSAFE_SOURCES' : 'NO_EVIDENCE' }
  }
  // sau khi có nguồn/tài liệu an toàn, sẽ gọi buildMessages để tạo ra các tin nhắn để chuyển cho model, gọi client.complete để lấy câu trả lời từ model
  // sẽ gửi gầm Câu hỏi gốc
  //Các nguồn đã lọc
  ///Lịch sử đã chọn
  const messages = buildMessages(input.message, sources, history)
  // sai khi có messages tiếp tục kiểm tra signal có bị abort chưa, nếu có => throw lỗi
  signal?.throwIfAborted()
  // đã đi vào nhánh model
  run.origin = 'model'
  run.modelCalls += 1
  //sau khi đã có messages, gọi client.complete để lấy câu trả lời từ model, chuyển signal vào để có thể hủy gọi nếu hết thời gian
  const completion = await client.complete(messages, { signal })
  signal?.throwIfAborted()
  //ghi nhận model thực tế được gọi và số lượng token được dùng
  run.actualModel = completion.model
  run.inputTokens = completion.inputTokens
  run.outputTokens = completion.outputTokens
  run.thinkingTokens = completion.thinkingTokens
  run.totalTokens = completion.totalTokens
  //completion.content là nội dung model trả về.
  // gọi hàm parseChatOutput để lấy ra trạng thái và câu trả lời từ completion.content, 
  // nếu trạng thái = refused => trả về MODEL_REFUSAL
  const output = parseChatOutput(completion.content)
  if (output.status === 'refused') {
    return { ...base, reply: MODEL_REFUSAL, sources: [], generatedByModel: false, status: 'refused', reasonCode: 'MODEL_REFUSED' }
  }
  //output.reply sẽ gồm câu trả lời từ model, sẽ gọi hàm validateChatAnswer để kiểm tra câu trả lời có hợp lệ không, nếu không => throw lỗi
  const reply = output.reply
  validateChatAnswer(reply, sources)
  // sau khi đã có câu trả lời, sẽ lấy ra các nguồn được trích dẫn bằng regex /\[\d+\]/g, nếu không có nguồn nào được trích dẫn => trả về NO_CHAT_EVIDENCE
  const cited = new Set(reply.match(/\[\d+\]/g))
  // nếu không có nguồn nào được trích dẫn => trả về NO_CHAT_EVIDENCE
  const publishedSources = sources.filter((source) => cited.has(source.citation))
  signal?.throwIfAborted()
  return { ...base, reply, sources: publishedSources, generatedByModel: true, status: 'answered', reasonCode: 'RAG_ANSWERED' }
}
