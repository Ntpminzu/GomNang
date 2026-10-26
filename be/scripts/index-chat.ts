import { drizzle } from 'drizzle-orm/node-postgres'
import type { PoolClient } from 'pg'
import { createPool } from '../src/infrastructure/database/postgres.ts'
import { requireCurrentMigrations } from '../src/infrastructure/database/migration-status.ts'
import { createOllamaEmbedder } from '../src/modules/chat/chat.embedding.ts'
import { buildChatChunks, createIndex, indexFingerprint } from '../src/modules/chat/chat.retrieval.ts'
import { listPublicChatSources } from '../src/modules/projects/projects.repository.ts'
import { HttpError } from '../src/common/errors/http-error.ts'

// Khóa chung mọi embedding model của cùng DB; cần direct/session connection, không transaction pooler.
const INDEX_LOCK = 71502027

async function indexChat() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new HttpError(503, 'INDEX_DATABASE_REQUIRED', 'Cần DATABASE_URL PostgreSQL trong be/.env; lệnh không tự tạo DB PGlite.')
  const target = new URL(databaseUrl)
  if (target.port === '6543' || target.searchParams.get('pgbouncer') === 'true') {
    throw new HttpError(503, 'INDEX_SESSION_REQUIRED', 'Lệnh index cần kết nối trực tiếp hoặc session pooler; không hỗ trợ transaction pooler.')
  }
  const model = process.env.OLLAMA_EMBEDDING_MODEL || 'qwen3-embedding:0.6b'
  const baseUrl = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '')
  const embedder = createOllamaEmbedder(baseUrl, model)
  const pool = createPool(databaseUrl)
  let client: PoolClient | undefined
  let locked = false
  let connectionLost = false
  const started = performance.now()
  try {
    client = await pool.connect()
    client.on('error', () => { connectionLost = true })
    const lock = await client.query('select pg_try_advisory_lock($1) as acquired', [INDEX_LOCK])
    locked = lock.rows[0]?.acquired === true
    if (!locked) throw new HttpError(409, 'INDEX_BUSY', 'Một lệnh index khác đang chạy trên DB này. Hãy chờ rồi chạy lại.')
    await requireCurrentMigrations(client)
    const db = drizzle(client)
    const prepared = await db.transaction(async (tx) => {
      const projects = await listPublicChatSources(tx)
      const chunks = buildChatChunks(projects)
      const indexedProjects = new Set(chunks.flatMap((chunk) => chunk.projectId === null ? [] : [chunk.projectId]))
      return { chunks, excludedProjects: projects.length - indexedProjects.size }
    }, {
      isolationLevel: 'repeatable read', accessMode: 'read only',
    })
    const desired = prepared.chunks
    const fingerprint = indexFingerprint(desired)
    const summary = await createIndex(db, embedder, desired, async (tx) => {
      if (connectionLost) throw new HttpError(503, 'INDEX_CONNECTION_LOST', 'Kết nối index đã mất; chưa ghi chỉ mục mới. Hãy chạy lại lệnh.')
      const current = buildChatChunks(await listPublicChatSources(tx))
      if (indexFingerprint(current) !== fingerprint) {
        throw new HttpError(409, 'INDEX_SOURCE_CHANGED', 'Nguồn đã thay đổi trong lúc tạo vector. Chưa ghi chỉ mục mới; hãy chạy lại lệnh.')
      }
    })
    console.log(JSON.stringify({ status: 'indexed', model, ...summary, excludedProjects: prepared.excludedProjects, durationMs: Math.round(performance.now() - started) }, null, 2))
  } finally {
    if (client) {
      if (locked && !connectionLost) await client.query('select pg_advisory_unlock($1)', [INDEX_LOCK]).catch(() => { connectionLost = true })
      client.release(connectionLost)
    }
    await pool.end()
  }
}

try { await indexChat() } catch (error) {
  // Không in lỗi Drizzle/pg thô: có thể chứa SQL parameters hoặc thông tin kết nối.
  console.error(JSON.stringify({ status: 'failed', code: error instanceof HttpError ? error.code : 'INDEX_FAILED',
    message: error instanceof HttpError ? error.message : 'Không tạo được chỉ mục. Kiểm tra cấu hình DB/session, schema và Ollama rồi chạy lại.' }))
  process.exitCode = 1
}
