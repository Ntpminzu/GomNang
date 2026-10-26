import type { ChatModelOption, ChatReply } from '@gomnang/domain/types.ts'
import { HttpError } from '../../common/errors/http-error.ts'
import type { Db } from '../../infrastructure/database/client.ts'
import type { ChatInput } from './chat.schema.ts'
import type { ChatModels } from './chat.model.ts'
import type { ChatEmbedder } from './chat.embedding.ts'
import { retrieve } from './chat.retrieval.ts'
import { selectHistory, isFollowUpQuestion, buildRetrievalQuestion, buildMessages } from './chat.rag.ts'
import { PROMPT_VERSION } from './chat.config.ts'
import { parseChatOutput, validateChatAnswer } from './chat.output.ts'
import { newChatRun, type ChatRun } from './chat.telemetry.ts'
import { filterSafeChatSources, GUARD_REPLIES, inspectChatInput } from './chat.guard.ts'
import type { ChatDeadline } from './chat.runtime.ts'

export type ChatDeps = {
  db: Db
  models: ChatModels
  embedder: ChatEmbedder
}

export function listChatModels(models: ChatModels): ChatModelOption[] {
  return [{ id: 'ollama', name: models.ollama.name, available: models.ollama.client !== null }]
}

export const NO_CHAT_EVIDENCE = 'Mình chưa tìm thấy nguồn công khai đủ để trả lời câu hỏi này. Bạn có thể xem trang Dự án hoặc hỏi cụ thể hơn.'
const MODEL_REFUSAL = 'Mình chưa thể trả lời yêu cầu này trong phạm vi nguồn công khai của GomNang. Bạn có thể hỏi cụ thể về dự án hoặc cách sử dụng website.'

export async function answerQuestion(deps: ChatDeps, input: ChatInput, run: ChatRun = newChatRun(deps, input.model), deadline?: ChatDeadline): Promise<ChatReply> {
  deadline?.check()
  const base = { requestId: run.requestId, promptVersion: PROMPT_VERSION }
  const inputIssue = inspectChatInput(input.message, input.history)
  if (inputIssue) {
    run.origin = 'rule'
    return { ...base, reply: GUARD_REPLIES[inputIssue], sources: [], generatedByModel: false, status: 'refused', reasonCode: inputIssue }
  }
  const client = deps.models[input.model].client
  if (!client) throw new HttpError(503, 'CHAT_MODEL_UNAVAILABLE', 'Model này chưa được cấu hình trên máy chủ.')
  const history = isFollowUpQuestion(input.message) ? selectHistory(input.history) : []
  const retrievalQuestion = buildRetrievalQuestion(input.message, history)
  const embedder: ChatEmbedder = {
    ...deps.embedder,
    async embedQuery(question, options) {
      deadline?.check()
      run.embeddingCalls += 1
      return deps.embedder.embedQuery(question, options)
    },
  }
  const findSources = () => retrieve(deps.db, embedder, retrievalQuestion, undefined, undefined, deadline?.signal)
  const candidates = await (deadline ? deadline.run(findSources) : findSources())
  const { sources, excluded } = filterSafeChatSources(candidates)
  if (sources.length === 0) {
    run.origin = 'rule'
    return { ...base, reply: excluded > 0 ? GUARD_REPLIES.UNSAFE_SOURCES : NO_CHAT_EVIDENCE, sources: [], generatedByModel: false,
      status: 'refused', reasonCode: excluded > 0 ? 'UNSAFE_SOURCES' : 'NO_EVIDENCE' }
  }
  const messages = buildMessages(input.message, sources, history)
  deadline?.check()
  run.origin = 'model'
  run.modelCalls += 1
  const generate = () => client.complete(messages, { signal: deadline?.signal })
  const completion = await (deadline ? deadline.run(generate) : generate())
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
  deadline?.check()
  validateChatAnswer(reply, sources)
  const cited = new Set(reply.match(/\[\d+\]/g))
  const publishedSources = sources.filter((source) => cited.has(source.citation))
  const checkedSources = filterSafeChatSources(candidates).sources
  if (publishedSources.some((source) => !checkedSources.some((checked) => checked.id === source.id))) {
    run.origin = 'rule'
    return { ...base, reply: GUARD_REPLIES.UNSAFE_SOURCES, sources: [], generatedByModel: false, status: 'refused', reasonCode: 'UNSAFE_SOURCES' }
  }
  deadline?.check()
  return { ...base, reply, sources: publishedSources, generatedByModel: true, status: 'answered', reasonCode: 'RAG_ANSWERED' }
}
