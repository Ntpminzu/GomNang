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
  signal?.throwIfAborted()
  const base = { promptVersion: PROMPT_VERSION }
  const inputIssue = inspectChatInput(input.message, input.history)
  if (inputIssue) {
    run.origin = 'rule'
    return { ...base, reply: GUARD_REPLIES[inputIssue], sources: [], generatedByModel: false, status: 'refused', reasonCode: inputIssue }
  }
  const client = deps.model.client
  if (!client) throw new HttpError(503, 'CHAT_MODEL_UNAVAILABLE', 'Model này chưa được cấu hình trên máy chủ.')
  const history = isFollowUpQuestion(input.message) ? selectHistory(input.history) : []
  const retrievalQuestion = buildRetrievalQuestion(input.message, history)
  const embedder: ChatEmbedder = {
    ...deps.embedder,
    async embedQuery(question, options) {
      signal?.throwIfAborted()
      run.embeddingCalls += 1
      return deps.embedder.embedQuery(question, options)
    },
  }
  const candidates = await retrieve(deps.db, embedder, retrievalQuestion, undefined, undefined, signal)
  const { sources, excluded } = filterSafeChatSources(candidates)
  if (sources.length === 0) {
    run.origin = 'rule'
    return { ...base, reply: excluded > 0 ? GUARD_REPLIES.UNSAFE_SOURCES : NO_CHAT_EVIDENCE, sources: [], generatedByModel: false,
      status: 'refused', reasonCode: excluded > 0 ? 'UNSAFE_SOURCES' : 'NO_EVIDENCE' }
  }
  const messages = buildMessages(input.message, sources, history)
  signal?.throwIfAborted()
  run.origin = 'model'
  run.modelCalls += 1
  const completion = await client.complete(messages, { signal })
  signal?.throwIfAborted()
  run.actualModel = completion.model
  run.inputTokens = completion.inputTokens
  run.outputTokens = completion.outputTokens
  run.thinkingTokens = completion.thinkingTokens
  run.totalTokens = completion.totalTokens
  const output = parseChatOutput(completion.content)
  if (output.status === 'refused') {
    return { ...base, reply: MODEL_REFUSAL, sources: [], generatedByModel: false, status: 'refused', reasonCode: 'MODEL_REFUSED' }
  }
  const reply = output.reply
  validateChatAnswer(reply, sources)
  const cited = new Set(reply.match(/\[\d+\]/g))
  const publishedSources = sources.filter((source) => cited.has(source.citation))
  signal?.throwIfAborted()
  return { ...base, reply, sources: publishedSources, generatedByModel: true, status: 'answered', reasonCode: 'RAG_ANSWERED' }
}
