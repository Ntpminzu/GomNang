import { and, asc, cosineDistance, eq, inArray, isNull, lt, or } from 'drizzle-orm'
import { PUBLIC_PROJECT_STATUSES } from '@gomnang/domain/types.ts'
import type { Db, Tx } from '../../infrastructure/database/client.ts'
import { chatChunks, projects } from '../../infrastructure/database/schema.ts'
import { ragConfig } from './chat.config.ts'
import type { IndexedChatSource } from './chat.guard.ts'

export function listIndexedChunks(db: Db) {
  return db.select({ id: chatChunks.id, projectId: chatChunks.projectId, title: chatChunks.title, url: chatChunks.url,
    content: chatChunks.content, contentHash: chatChunks.contentHash, embeddingModel: chatChunks.embeddingModel }).from(chatChunks)
}

export async function hasIndexForModel(db: Db, model: string) {
  const rows = await db.select({ id: chatChunks.id }).from(chatChunks).where(eq(chatChunks.embeddingModel, model)).limit(1)
  return rows.length > 0
}

export async function saveIndexChanges(
  db: Db,
  chunks: Array<typeof chatChunks.$inferInsert>,
  staleIds: string[],
  beforeSave?: (tx: Tx) => Promise<void>,
) {
  await db.transaction(async (tx) => {
    await beforeSave?.(tx)
    for (const chunk of chunks) {
      await tx.insert(chatChunks).values(chunk).onConflictDoUpdate({
        target: chatChunks.id,
        set: {
          projectId: chunk.projectId, title: chunk.title, url: chunk.url, content: chunk.content,
          contentHash: chunk.contentHash, embeddingModel: chunk.embeddingModel,
          embedding: chunk.embedding, updatedAt: chunk.updatedAt,
        },
      })
    }
    if (staleIds.length > 0) await tx.delete(chatChunks).where(inArray(chatChunks.id, staleIds))
  }, { isolationLevel: 'repeatable read' })
}

export async function selectSources(
  db: Db, embeddingModel: string, queryEmbedding: number[],
  limit = ragConfig.topK, minSimilarity = ragConfig.minSimilarity,
): Promise<IndexedChatSource[]> {
  const distance = cosineDistance(chatChunks.embedding, queryEmbedding)
  const rows = await db.select({ id: chatChunks.id, projectId: chatChunks.projectId, title: chatChunks.title, url: chatChunks.url, excerpt: chatChunks.content })
    .from(chatChunks).leftJoin(projects, eq(chatChunks.projectId, projects.id))
    .where(and(
      eq(chatChunks.embeddingModel, embeddingModel),
      or(isNull(chatChunks.projectId), inArray(projects.status, [...PUBLIC_PROJECT_STATUSES])),
      lt(distance, 1 - minSimilarity),
    ))
    .orderBy(asc(distance)).limit(limit)
  return rows.map((row, index) => ({ ...row, citation: `[${index + 1}]` }))
}
