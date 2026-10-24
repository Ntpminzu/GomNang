import { createHash } from 'node:crypto'
import { and, asc, cosineDistance, eq, inArray, lt } from 'drizzle-orm'
import { CHAT_GUIDES } from '@gomnang/domain/chat-knowledge.ts'
import { STATUS_LABEL, type ChatSource } from '@gomnang/domain/types.ts'
import type { Db } from '../../infrastructure/database/client.ts'
import { chatChunks } from '../../infrastructure/database/schema.ts'
import type { listPublicChatSources } from '../projects/projects.repository.ts'
import type { ChatEmbedder } from './chat.embedding.ts'

export type PublicProject = Awaited<ReturnType<typeof listPublicChatSources>>[number]
type Passage = Omit<ChatSource, 'citation'>

export type ChatChunkDraft = Passage & {
  projectId: string | null
  content: string
}

const DEFAULT_CHUNK_SIZE = 800
const DEFAULT_CHUNK_OVERLAP = 120
const DEFAULT_TOP_K = 5
const DEFAULT_MIN_SIMILARITY = 0.35
const EMBEDDING_BATCH_SIZE = 32

function normalize(value: string) {
  return value.toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/\p{M}/gu, '')
}
// chỗ này là giai đoạn ban đầu để phân biệt ban đầu để hệ thống nhận biết 
/** Câu hỏi về toàn bộ danh mục được xử lý riêng để không làm mất dự án vì top-k. */
export function isPublicProjectListRequest(question: string) {
  const value = normalize(question).replace(/[^a-z0-9]+/g, ' ').trim()
  const catalog = /\b(?:danh sach|liet ke) (?:cac |nhung )?du an\b/.test(value)
    || /\b(?:cac|nhung) du an\b/.test(value) && /\b(?:hien co|cong khai|dang co|nao)\b/.test(value)
    || /\bdu an nao (?:dang co|hien co|cong khai)\b/.test(value)
  return catalog && !/\bdu an\b.*\b(?:o|tai)\s+(?!dau\b)/.test(value)
}

/** Chia theo từ để không cắt giữa chữ; chunk sau lùi lại đủ số ký tự overlap. */
export function splitWithOverlap(
  value: string,
  maxLength = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP,
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
  maxLength = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP,
): ChatChunkDraft[] {
  const chunks: ChatChunkDraft[] = []
  for (const guide of CHAT_GUIDES) {
    const parts = splitWithOverlap(guide.text, maxLength, overlap)
    parts.forEach((content, index) => chunks.push({
      id: parts.length === 1 ? guide.id : `${guide.id}:chunk-${index + 1}`,
      projectId: null,
      title: parts.length === 1 ? guide.title : `${guide.title} — phần ${index + 1}`,
      url: `/help#${guide.anchor}`,
      excerpt: content,
      content,
    }))
  }
  for (const project of projects) {
    const parts = splitWithOverlap(projectDocument(project), maxLength, overlap)
    parts.forEach((content, index) => chunks.push({
      id: `project:${project.id}:chunk-${index + 1}`,
      projectId: project.id,
      title: parts.length === 1 ? project.name : `${project.name} — phần ${index + 1}`,
      url: `/projects/${project.id}`,
      excerpt: content,
      content,
    }))
  }
  return chunks
}

export function buildCatalogSources(projects: PublicProject[]): Passage[] {
  return [...projects]
    .sort((left, right) => left.name.localeCompare(right.name, 'vi'))
    .map((project) => ({
      id: `project:${project.id}:catalog`,
      title: `${project.name} — thông tin chung`,
      url: `/projects/${project.id}`,
      excerpt: projectDocument(project),
    }))
}

function hashChunk(chunk: ChatChunkDraft) {
  return createHash('sha256')
    .update(JSON.stringify([chunk.projectId, chunk.title, chunk.url, chunk.content]))
    .digest('hex')
}

async function embedChangedChunks(embedder: ChatEmbedder, chunks: ChatChunkDraft[]) {
  const embedded: Array<ChatChunkDraft & { embedding: number[]; contentHash: string }> = []
  for (let offset = 0; offset < chunks.length; offset += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(offset, offset + EMBEDDING_BATCH_SIZE)
    const vectors = await embedder.embedDocuments(batch.map((chunk) => chunk.content))
    batch.forEach((chunk, index) => embedded.push({
      ...chunk,
      embedding: vectors[index],
      contentHash: hashChunk(chunk),
    }))
  }
  return embedded
}

async function synchronizeIndex(db: Db, embedder: ChatEmbedder, desired: ChatChunkDraft[]) {
  const existing = await db.select({
    id: chatChunks.id,
    contentHash: chatChunks.contentHash,
    embeddingModel: chatChunks.embeddingModel,
  }).from(chatChunks)
  const existingById = new Map(existing.map((row) => [row.id, row]))
  const desiredIds = new Set(desired.map((chunk) => chunk.id))
  const changed = desired.filter((chunk) => {
    const current = existingById.get(chunk.id)
    return !current || current.contentHash !== hashChunk(chunk) || current.embeddingModel !== embedder.model
  })
  const staleIds = existing.filter((row) => !desiredIds.has(row.id)).map((row) => row.id)
  const embedded = await embedChangedChunks(embedder, changed)

  await db.transaction(async (tx) => {
    for (const chunk of embedded) {
      await tx.insert(chatChunks).values({
        id: chunk.id,
        projectId: chunk.projectId,
        title: chunk.title,
        url: chunk.url,
        content: chunk.content,
        contentHash: chunk.contentHash,
        embeddingModel: embedder.model,
        embedding: chunk.embedding,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: chatChunks.id,
        set: {
          projectId: chunk.projectId,
          title: chunk.title,
          url: chunk.url,
          content: chunk.content,
          contentHash: chunk.contentHash,
          embeddingModel: embedder.model,
          embedding: chunk.embedding,
          updatedAt: new Date(),
        },
      })
    }
    if (staleIds.length > 0) await tx.delete(chatChunks).where(inArray(chatChunks.id, staleIds))
  })
}

const syncQueues = new WeakMap<object, Promise<void>>()

/** Tuần tự hóa sync để hai câu hỏi đồng thời không cùng embedding một bộ chunk. */
async function ensureIndex(db: Db, embedder: ChatEmbedder, desired: ChatChunkDraft[]) {
  const previous = syncQueues.get(db) ?? Promise.resolve()
  const current = previous.catch(() => undefined).then(() => synchronizeIndex(db, embedder, desired))
  syncQueues.set(db, current)
  try {
    await current
  } finally {
    if (syncQueues.get(db) === current) syncQueues.delete(db)
  }
}

/** Semantic retrieval bằng pgvector; không còn xếp hạng theo từ trùng. */
export async function retrieveChatChunks(
  db: Db,
  embedder: ChatEmbedder,
  question: string,
  desired: ChatChunkDraft[],
  limit = DEFAULT_TOP_K,
  minSimilarity = DEFAULT_MIN_SIMILARITY,
): Promise<Passage[]> {
  await ensureIndex(db, embedder, desired)
  const queryEmbedding = await embedder.embedQuery(question)
  const distance = cosineDistance(chatChunks.embedding, queryEmbedding)
  return db.select({
    id: chatChunks.id,
    title: chatChunks.title,
    url: chatChunks.url,
    excerpt: chatChunks.content,
  }).from(chatChunks)
    .where(and(eq(chatChunks.embeddingModel, embedder.model), lt(distance, 1 - minSimilarity)))
    .orderBy(asc(distance))
    .limit(limit)
}
