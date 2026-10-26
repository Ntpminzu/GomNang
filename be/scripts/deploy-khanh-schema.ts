// Áp migration 0015 (xoá mềm, chứng từ, ai_requests) lên Supabase trong một transaction. Mặc định chỉ xem trước; thêm --apply để ghi.
import assert from 'node:assert/strict'
import { createPool } from '../src/infrastructure/database/postgres.ts'
import { localMigrations, migrationCount } from '../src/infrastructure/database/migration-status.ts'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL_REQUIRED')
if (!/\.supabase\.(?:com|co)$/.test(new URL(url).hostname)) throw new Error('SUPABASE_TARGET_REQUIRED')
const apply = process.argv.includes('--apply')
const migrations = localMigrations()
assert.equal(migrations.length, 16)
const target = migrations[15]
assert.equal(target.tag, '0015_khanh_us2_us5_us8')
const tables = ['assessments', 'audit_log', 'auth_sessions', 'chat_chunks', 'chat_requests', 'contributions', 'expenses', 'need_items', 'oauth_identities', 'project_updates', 'projects', 'users']
const pool = createPool(url)
const client = await pool.connect()
let committed = false

async function counts() {
  const rows: Record<string, number> = {}
  for (const t of tables) rows[t] = (await client.query(`select count(*)::int as n from public."${t}"`)).rows[0].n
  return rows
}

async function validate() {
  for (const [table, column] of [['projects', 'deleted_at'], ['expenses', 'receipt_file_id'], ['assessments', 'ai_request_id']]) {
    const n = (await client.query(`select count(*)::int as n from information_schema.columns where table_schema='public' and table_name=$1 and column_name=$2`, [table, column])).rows[0].n
    assert.equal(n, 1, `${table}.${column}`)
  }
  for (const t of ['files', 'ai_requests']) {
    assert.equal((await client.query(`select relrowsecurity from pg_class where oid=$1::regclass`, [`public.${t}`])).rows[0].relrowsecurity, true)
    for (const role of ['anon', 'authenticated']) {
      if ((await client.query('select 1 from pg_roles where rolname=$1', [role])).rowCount) {
        assert.equal((await client.query(`select has_table_privilege($1, $2, 'SELECT,INSERT,UPDATE,DELETE') as ok`, [role, `public.${t}`])).rows[0].ok, false)
      }
    }
  }
}

try {
  await client.query('BEGIN')
  await client.query("SET LOCAL lock_timeout='5s'")
  await client.query("SET LOCAL statement_timeout='60s'")
  await client.query('select pg_advisory_xact_lock(71502026)')
  const count = await migrationCount(client)
  assert.ok(count === 15 || count === 16, 'Expected 0014 baseline')
  if (count === 16) {
    await validate()
    console.log(JSON.stringify({ status: 'already_current' }))
  } else if (!apply) {
    console.log(JSON.stringify({ status: 'preview', migration: target.tag, rows: await counts() }))
  } else {
    const before = await counts()
    for (const statement of target.sql) if (statement.trim()) await client.query(statement)
    await client.query('insert into drizzle.__drizzle_migrations(hash, created_at) values($1, $2)', [target.hash, target.folderMillis])
    await validate()
    assert.deepEqual(await counts(), before, 'Row counts changed')
    assert.equal((await client.query('select count(*)::int as n from public.projects where deleted_at is not null')).rows[0].n, 0)
    await client.query('COMMIT')
    committed = true
    console.log(JSON.stringify({ status: 'committed', migrations: 16, rows: before }))
  }
} catch (error) {
  console.error(JSON.stringify({ status: 'failed', message: (error as Error).message, code: (error as { code?: string }).code }))
  process.exitCode = 1
} finally {
  if (!committed) await client.query('ROLLBACK').catch(() => {})
  client.release()
  await pool.end()
}
