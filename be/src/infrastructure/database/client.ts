import { fileURLToPath } from 'node:url'
import { openPglite } from './pglite.ts'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { createPool } from './postgres.ts'
import { requireCurrentMigrations } from './migration-status.ts'
import { log } from '../logging/logger.ts'

export type Db = PgDatabase<PgQueryResultHKT>
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
/** Hàm truy vấn nhận được cả kết nối thường lẫn transaction. */
export type Exec = Db | Tx

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../drizzle', import.meta.url))

/** Pool riêng cho chat để AI chậm không giữ hết connection của nghiệp vụ non-AI. Không DDL/seed. */
export function openChatDb(databaseUrl: string) {
  const target = new URL(databaseUrl)
  const pool = createPool(databaseUrl, {
    max: 2, connectionTimeoutMillis: 5_000,
    query_timeout: 11_000, application_name: 'gomnang-chat',
    async onConnect(client) {
      if (target.port === '6543' || target.searchParams.get('pgbouncer') === 'true') throw new Error('CHAT_DATABASE_SESSION_REQUIRED')
      await client.query("SET statement_timeout = '10s'")
    },
  })
  pool.on('error', () => log('warn', 'chat database pool error', { code: 'CHAT_DATABASE_UNAVAILABLE' }))
  return { db: pgDrizzle(pool), close: () => pool.end() }
}

// DATABASE_URL selects PostgreSQL; tests and offline development can still use PGlite.
export async function openDb(dataDir: string | null, databaseUrl?: string) {
  if (databaseUrl) {
    const pool = createPool(databaseUrl)
    const db = pgDrizzle(pool)
    try {
      await requireCurrentMigrations(pool)
      return { db, close: () => pool.end() }
    } catch (error) {
      await pool.end()
      throw error
    }
  }
  const { client, close } = await openPglite(dataDir)
  const db = drizzle(client)
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR })
    return { db, close }
  } catch (error) {
    await close()
    throw error
  }
}
