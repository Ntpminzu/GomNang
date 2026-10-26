import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import type { Pool, PoolClient } from 'pg'

export const migrationsFolder = fileURLToPath(new URL('../../../drizzle', import.meta.url))

export function localMigrations() {
  const migrations = readMigrationFiles({ migrationsFolder })
  const journal = JSON.parse(readFileSync(new URL('../../../drizzle/meta/_journal.json', import.meta.url), 'utf8')) as { entries: { tag: string }[] }
  return migrations.map((migration, index) => {
    const tag = journal.entries[index].tag
    const text = readFileSync(new URL(`../../../drizzle/${tag}.sql`, import.meta.url), 'utf8')
    const lf = text.replaceAll('\r\n', '\n')
    return { ...migration, tag, hashes: [text, lf, lf.replaceAll('\n', '\r\n')].map((value) => createHash('sha256').update(value).digest('hex')) }
  })
}

/** Chỉ đọc journal, không tạo schema hay tự apply migration PostgreSQL. */
export async function migrationCount(connection: Pool | PoolClient) {
  const exists = await connection.query("select to_regclass('drizzle.__drizzle_migrations') as journal")
  if (!exists.rows[0]?.journal) throw new Error('DATABASE_MIGRATIONS_MISSING: deploy the reviewed schema before starting the backend.')
  const local = localMigrations()
  const rows = (await connection.query('select hash, created_at from drizzle.__drizzle_migrations order by created_at, id')).rows
  if (rows.length > local.length) throw new Error('DATABASE_MIGRATION_AHEAD: this checkout is older than the database.')
  rows.forEach((row, index) => {
    if (!local[index].hashes.includes(row.hash) || String(row.created_at) !== String(local[index].folderMillis)) {
      throw new Error(`DATABASE_MIGRATION_DRIFT: journal index ${index}; deployment stopped.`)
    }
  })
  return rows.length
}

export async function requireCurrentMigrations(pool: Pool | PoolClient) {
  const count = await migrationCount(pool)
  const pending = localMigrations().slice(count).map((migration) => migration.tag)
  if (pending.length > 0) throw new Error(`DATABASE_MIGRATIONS_PENDING: ${pending.join(', ')}. Run the reviewed deployment command separately; startup never applies PostgreSQL migrations.`)
}
