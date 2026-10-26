import { createHash } from 'node:crypto'
import { CHAT_GUIDES } from '@gomnang/domain/chat-knowledge.ts'
import { PUBLIC_PROJECT_STATUSES, STATUS_LABEL, type ChatSource } from '@gomnang/domain/types.ts'
import type { Db, Tx } from '../../infrastructure/database/client.ts'
import { HttpError } from '../../common/errors/http-error.ts'
import type { listPublicChatSources } from '../projects/projects.repository.ts'
import type { ChatEmbedder } from './chat.embedding.ts'
import { ragConfig } from './chat.config.ts'
import * as repository from './chat.repository.ts'
import { filterSafeIndexChunks, inspectSourceText, type IndexedChatSource } from './chat.guard.ts'

type PublicProject = Awaited<ReturnType<typeof listPublicChatSources>>[number]
export type ChatChunkDraft = Omit<ChatSource, 'citation' | 'excerpt'> & {
  projectId: string | null
  content: string
}

/** Chia theo từ để không cắt giữa chữ; chunk sau lùi lại đủ số ký tự overlap. */
export function chunkText(
  value: string,
  maxLength = ragConfig.chunkSize,
  overlap = ragConfig.overlap,
): string[] {
  if (!Number.isInteger(maxLength) || maxLength <= 0) throw new Error('maxLength phải là số nguyên dương')
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= maxLength) {
    throw new Error('overlap phải từ 0 đến nhỏ hơn maxLength')
  }
  const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  if (words.length === 0) return []
  const chunks: string[] = []
  let start = 0
  while (start < words.length) {
    let end = start
    let length = 0
    while (end < words.length) {
      const nextLength = length + (length === 0 ? 0 : 1) + words[end].length
      if (end > start && nextLength > maxLength) break
      length = nextLength
      end += 1
    }
    chunks.push(words.slice(start, end).join(' '))
    if (end === words.length) break

    let nextStart = end
    let overlapLength = 0
    while (nextStart > start + 1 && overlapLength < overlap) {
      nextStart -= 1
      overlapLength += words[nextStart].length + (overlapLength === 0 ? 0 : 1)
    }
    start = nextStart
  }
  return chunks
}

function projectDocument(project: PublicProject) {
  const needs = project.needs.length === 0
    ? 'Chưa công bố nhu cầu đóng góp.'
    : project.needs.map((need) => `${need.label}: ${need.targetQty} ${need.unit}`).join('; ')
  return [
    `Dự án ${project.name}.`,
    `Trạng thái: ${STATUS_LABEL[project.status]}.`,
    `Địa điểm: ${project.location}.`,
    `Nhóm thụ hưởng: ${project.beneficiaryGroup}.`,
    `Thời gian: ${project.startDate} đến ${project.endDate}.`,
    `Mục tiêu: ${project.goal}`,
    `Nhu cầu đóng góp: ${needs}`,
  ].join(' ')
}

/** Chuyển nguồn công khai thành document rồi chia chunk có overlap và ID ổn định. */
export function buildChatChunks(
  projects: PublicProject[],
  maxLength = ragConfig.chunkSize,
  overlap = ragConfig.overlap,
): ChatChunkDraft[] {
  const chunks: ChatChunkDraft[] = []
  for (const guide of CHAT_GUIDES) {
    if (inspectSourceText([guide.title, guide.text].join('\n'))) continue
    const parts = chunkText(guide.text, maxLength, overlap)
    parts.forEach((content, index) => chunks.push({
      id: parts.length === 1 ? guide.id : `${guide.id}:chunk-${index + 1}`,
      projectId: null,
      title: parts.length === 1 ? guide.title : `${guide.title} — phần ${index + 1}`,
      url: `/help#${guide.anchor}`,
      content,
    }))
  }
  for (const project of projects) {
    if (!PUBLIC_PROJECT_STATUSES.some((status) => status === project.status)) continue
    const document = projectDocument(project)
    if (inspectSourceText([project.name, document].join('\n'))) continue
    const parts = chunkText(document, maxLength, overlap)
    parts.forEach((content, index) => chunks.push({
      id: `project:${project.id}:chunk-${index + 1}`,
      projectId: project.id,
      title: parts.length === 1 ? project.name : `${project.name} — phần ${index + 1}`,
      url: `/projects/${project.id}`,
      content,
    }))
  }
  return chunks
}

function hashChunk(chunk: ChatChunkDraft) {
  return createHash('sha256')
    .update(JSON.stringify([chunk.projectId, chunk.title, chunk.url, chunk.content]))
    .digest('hex')
}

/** Không phụ thuộc thứ tự trả về của truy vấn dự án. */
export function indexFingerprint(chunks: ChatChunkDraft[]) {
  return JSON.stringify(chunks.map((chunk) => [chunk.id, hashChunk(chunk)]).sort(([left], [right]) => left.localeCompare(right)))
}

export type IndexSummary = { added: number; updated: number; removed: number; unchanged: number; total: number; excluded: number }

async function embedChangedChunks(embedder: ChatEmbedder, chunks: ChatChunkDraft[]) {
  const embedded: Array<ChatChunkDraft & { embedding: number[]; contentHash: string }> = []
  for (let offset = 0; offset < chunks.length; offset += ragConfig.embeddingBatchSize) {
    const batch = chunks.slice(offset, offset + ragConfig.embeddingBatchSize)
    const vectors = await embedder.embedDocuments(batch.map((chunk) => chunk.content))
    batch.forEach((chunk, index) => embedded.push({
      ...chunk,
      embedding: vectors[index],
      contentHash: hashChunk(chunk),
    }))
  }
  return embedded
}

async function synchronizeIndex(db: Db, embedder: ChatEmbedder, desired: ChatChunkDraft[], beforeSave?: (tx: Tx) => Promise<void>): Promise<IndexSummary> {
  const safe = filterSafeIndexChunks(desired)
  const excluded = desired.length - safe.length
  desired = safe
  const existing = await repository.listIndexedChunks(db)
  const existingById = new Map(existing.map((row) => [row.id, row]))
  const desiredIds = new Set(desired.map((chunk) => chunk.id))
  const changed = desired.filter((chunk) => {
    const current = existingById.get(chunk.id)
    return !current || current.contentHash !== hashChunk(chunk) || hashChunk(current) !== current.contentHash
      || current.embeddingModel !== embedder.model
  })
  const staleIds = existing.filter((row) => !desiredIds.has(row.id)).map((row) => row.id)
  const embedded = await embedChangedChunks(embedder, changed)

  await repository.saveIndexChanges(db, embedded.map((chunk) => ({
    id: chunk.id, projectId: chunk.projectId, title: chunk.title, url: chunk.url,
    content: chunk.content, contentHash: chunk.contentHash, embeddingModel: embedder.model,
    embedding: chunk.embedding, updatedAt: new Date(),
  })), staleIds, beforeSave)
  const added = changed.filter((chunk) => !existingById.has(chunk.id)).length
  return { added, updated: changed.length - added, removed: staleIds.length, unchanged: desired.length - changed.length, total: desired.length, excluded }
}

const syncQueues = new WeakMap<object, Promise<IndexSummary>>()

/** Chỉ CLI/fixture gọi; CLI còn giữ advisory lock để chặn các tiến trình index khác. */
export async function createIndex(db: Db, embedder: ChatEmbedder, desired: ChatChunkDraft[], beforeSave?: (tx: Tx) => Promise<void>) {
  const previous = syncQueues.get(db) ?? Promise.resolve()
  const current = previous.catch(() => undefined).then(() => synchronizeIndex(db, embedder, desired, beforeSave))
  syncQueues.set(db, current)
  try {
    return await current
  } finally {
    if (syncQueues.get(db) === current) syncQueues.delete(db)
  }
}

/** Chỉ tìm trên index đã tạo bằng lệnh; không đồng bộ hoặc kiểm nội dung mới. */
export async function retrieve(
  db: Db,
  embedder: ChatEmbedder,
  question: string,
  limit = ragConfig.topK,
  minSimilarity = ragConfig.minSimilarity,
  signal?: AbortSignal,
): Promise<IndexedChatSource[]> {
  signal?.throwIfAborted()
  if (!await repository.hasIndexForModel(db, embedder.model)) {
    throw new HttpError(503, 'CHAT_INDEX_NOT_READY', 'Nguồn trả lời của trợ lý chưa được chuẩn bị cho model tìm kiếm hiện tại. Vui lòng liên hệ người quản trị.')
  }
  signal?.throwIfAborted()
  const queryEmbedding = await embedder.embedQuery(question, { signal })
  signal?.throwIfAborted()
  const sources = await repository.selectSources(db, embedder.model, queryEmbedding, limit, minSimilarity)
  signal?.throwIfAborted()
  return sources
}
