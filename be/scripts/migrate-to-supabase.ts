import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { openPglite } from '../src/infrastructure/database/pglite.ts'
import { createPool } from '../src/infrastructure/database/postgres.ts'

const tables = ['users', 'projects', 'need_items', 'contributions', 'assessments', 'audit_log', 'project_updates', 'expenses'] as const
const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is required')
const pool = createPool(url)
const apply = process.argv.includes('--apply')
try {
  const connection = await pool.connect()
  try {
    await connection.query("SET TIME ZONE 'UTC'")
    const result = await connection.query("select tablename from pg_tables where schemaname = 'public' order by tablename")
    console.log('Remote public tables:', result.rows.map(r => r.tablename))
    if (!apply) {
      console.log('Connection verified. Use --apply to back up and transfer local data.')
    } else {
      const local = await openPglite(process.env.DATA_DIR || '.data/pglite')
      const backup = resolve('.data', `supabase-transfer-${new Date().toISOString().replace(/[:.]/g, '-')}`)
      const rows: Record<string, unknown[]> = {}
      try {
        await mkdir(backup, { recursive: true })
        const dump = await local.client.dumpDataDir()
        await writeFile(resolve(backup, 'pglite.tar.gz'), Buffer.from(await dump.arrayBuffer()))
        await local.client.exec("SET TIME ZONE 'UTC'")
        for (const table of tables) {
          const data = await local.client.query<{ row: unknown }>(`select row_to_json(t) as row from (select * from public.${table} order by id) t`)
          rows[table] = data.rows.map(r => r.row)
        }
        await writeFile(resolve(backup, 'data.json'), JSON.stringify(rows, null, 2))
        console.log('Local backup:', backup)
      } finally {
        await local.close()
      }
      // Only our versioned migrations create/update the application schema.
      await migrate(drizzle(connection), { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) })
      await connection.query('BEGIN')
      try {
        await connection.query(`LOCK TABLE ${tables.map(t => `public.${t}`).join(', ')} IN ACCESS EXCLUSIVE MODE`)
        for (const table of tables) {
          // Browser Supabase roles must not bypass the backend JWT/authorization checks.
          await connection.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`)
          const current = await connection.query(`select row_to_json(t) as row from (select * from public.${table} order by id) t`)
          if (current.rows.length > 0) {
            if (!isDeepStrictEqual(current.rows.map(r => r.row), rows[table])) {
              throw new Error(`Remote ${table} contains different data; refusing to overwrite`)
            }
          } else {
            await connection.query(`insert into public.${table} select * from json_populate_recordset(null::public.${table}, $1::json)`, [JSON.stringify(rows[table])])
          }
          const verified = await connection.query(`select row_to_json(t) as row from (select * from public.${table} order by id) t`)
          if (!isDeepStrictEqual(verified.rows.map(r => r.row), rows[table])) throw new Error(`Verification failed: ${table}`)
          console.log(`${table}: ${verified.rows.length} rows, all values verified`)
        }
        await connection.query('COMMIT')
        console.log('Transfer committed. Original local database retained.')
      } catch (error) {
        await connection.query('ROLLBACK')
        throw error
      }
    }
  } finally {
    connection.release()
  }
} catch (error) {
  // Avoid printing connection options or row contents (credentials and personal data).
  console.error('Transfer failed:', (error as Error).message)
  process.exitCode = 1
} finally {
  await pool.end()
}
