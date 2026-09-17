import { fileURLToPath } from 'node:url'
import { openPglite } from './pglite.ts'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { migrate as pgMigrate } from 'drizzle-orm/node-postgres/migrator'
import { createPool } from './postgres.ts'

export type Db = PgDatabase<PgQueryResultHKT>
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
/** Hàm truy vấn nhận được cả kết nối thường lẫn transaction. */
export type Exec = Db | Tx

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../drizzle', import.meta.url))

// DATABASE_URL selects PostgreSQL; tests and offline development can still use PGlite.
export async function openDb(dataDir: string | null, databaseUrl?: string) {
  if (databaseUrl) {
    const pool = createPool(databaseUrl)
    const db = pgDrizzle(pool)
    try {
      await pgMigrate(db, { migrationsFolder: MIGRATIONS_DIR })
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
