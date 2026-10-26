import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPool } from '../src/infrastructure/database/postgres.ts'
import { localMigrations, migrationCount } from '../src/infrastructure/database/migration-status.ts'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL_REQUIRED')
const target = new URL(url)
if (!/\.supabase\.(?:com|co)$/.test(target.hostname)) throw new Error('SUPABASE_TARGET_REQUIRED')
const apply = process.argv.includes('--apply')
const migrations = localMigrations()
assert.equal(migrations.length, 14, 'Only deploy the reviewed 0013 migration')
assert.equal(migrations[13].tag, '0013_chat_log_sequence')
const businessTables = ['assessments','audit_log','auth_sessions','chat_chunks','contributions','expenses','need_items','oauth_identities','project_updates','projects','users']
const pool = createPool(url)
const client = await pool.connect()
let committed = false
let backupDir: string | undefined

async function snapshot() {
  const business: Record<string, { count: number; digest: string }> = {}
  for (const name of businessTables) {
    const rows = (await client.query(`select row_to_json(t) as row from (select * from public."${name}" order by id) t`)).rows.map((item) => item.row)
    business[name] = { count: rows.length, digest: createHash('sha256').update(JSON.stringify(rows)).digest('hex') }
  }
  // Exclude exactly the identifiers/columns being replaced; compare every remaining metadata value.
  const logs = (await client.query(`select to_jsonb(t) - ARRAY['id','request_id','lifecycle','embedded_documents'] as row
    from public.chat_requests t order by (to_jsonb(t) - ARRAY['id','request_id','lifecycle','embedded_documents'])::text`)).rows.map((item) => item.row)
  return { business, logs: { count: logs.length, digest: createHash('sha256').update(JSON.stringify(logs)).digest('hex') } }
}

async function validate() {
  const columns = (await client.query("select column_name,data_type,is_identity from information_schema.columns where table_schema='public' and table_name='chat_requests'")).rows
  for (const name of ['id','lifecycle','embedded_documents','legacy_request_id']) assert.ok(!columns.some((col) => col.column_name === name))
  const key = columns.find((col) => col.column_name === 'request_id')
  assert.equal(key?.data_type, 'integer'); assert.equal(key?.is_identity, 'YES')
  const pk = (await client.query("select a.attname from pg_constraint c join unnest(c.conkey) as k(n) on true join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.n where c.conrelid='public.chat_requests'::regclass and c.contype='p'")).rows
  assert.deepEqual(pk.map((row) => row.attname), ['request_id'])
  assert.equal((await client.query("select relrowsecurity from pg_class where oid='public.chat_requests'::regclass")).rows[0].relrowsecurity, true)
  assert.equal((await client.query("select count(*)::int as n from pg_policies where schemaname='public' and tablename='chat_requests'")).rows[0].n, 0)
  for (const role of ['anon','authenticated']) {
    if ((await client.query('select 1 from pg_roles where rolname=$1', [role])).rowCount) {
      assert.equal((await client.query("select has_table_privilege($1,'public.chat_requests','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as allowed", [role])).rows[0].allowed, false)
      assert.equal((await client.query("select has_sequence_privilege($1,'public.chat_requests_request_id_seq','USAGE,SELECT,UPDATE') as allowed", [role])).rows[0].allowed, false)
    }
  }
}

function backup(snapshotId: string) {
  backupDir = fileURLToPath(new URL('../.data/chat-log-sequence-' + new Date().toISOString().replace(/[:.]/g, '-') + '/', import.meta.url))
  mkdirSync(backupDir, { recursive: true })
  const archive = join(backupDir, 'application.dump')
  const bin = process.env.PG_BIN || 'C:/Program Files/PostgreSQL/18/bin'
  const env = { ...process.env, PGHOST: target.hostname, PGPORT: target.port || '5432', PGUSER: decodeURIComponent(target.username),
    PGPASSWORD: decodeURIComponent(target.password), PGDATABASE: decodeURIComponent(target.pathname.slice(1)), PGSSLMODE: 'verify-full',
    PGSSLROOTCERT: fileURLToPath(new URL('../certs/prod-ca-2021.crt', import.meta.url)) }
  const dump = spawnSync(join(bin, 'pg_dump.exe'), ['--no-password','--format=custom','--schema=public','--schema=drizzle','--snapshot=' + snapshotId,'--lock-wait-timeout=5s','--file=' + archive], { env, encoding: 'utf8', windowsHide: true, timeout: 120_000 })
  assert.equal(dump.status, 0, 'BACKUP_FAILED')
  const list = spawnSync(join(bin, 'pg_restore.exe'), ['--list', archive], { encoding: 'utf8', windowsHide: true, timeout: 120_000 })
  assert.equal(list.status, 0, 'BACKUP_LIST_FAILED')
  for (const name of [...businessTables,'chat_requests','__drizzle_migrations']) assert.ok(list.stdout.split('\n').some((line) => line.includes('TABLE DATA ') && line.includes(' ' + name + ' ')), 'Archive missing: ' + name)
  assert.ok(statSync(archive).size > 0)
}

try {
  await client.query("SET TIME ZONE 'UTC'")
  await client.query('BEGIN')
  await client.query("SET LOCAL lock_timeout='5s'")
  await client.query("SET LOCAL statement_timeout='60s'")
  await client.query('select pg_advisory_xact_lock(71502026)')
  const count = await migrationCount(client)
  assert.ok(count === 13 || count === 14, 'Expected 0012 baseline or already migrated 0013')
  if (count === 14) {
    await validate()
    console.log(JSON.stringify({ status: 'already_current', migrations: count }))
  } else if (!apply) {
    console.log(JSON.stringify({ status: 'preview', migration: migrations[13].tag, before: await snapshot(), action: 'Back up public+drizzle, retain metadata rows, replace UUID/text IDs with one integer identity; remove lifecycle/embedded_documents' }))
  } else {
    await client.query('LOCK TABLE ' + [...businessTables,'chat_requests'].map((name) => `public."${name}"`).concat(['drizzle.__drizzle_migrations']).join(',') + ' IN SHARE MODE')
    const before = await snapshot()
    const mapping = (await client.query('select row_number() over(order by started_at,id)::int as new_request_id, id as old_id,request_id as old_request_id from public.chat_requests order by started_at,id')).rows
    backup((await client.query('select pg_export_snapshot() as id')).rows[0].id)
    writeFileSync(join(backupDir!, 'manifest.json'), JSON.stringify({ createdAt: new Date().toISOString(), before, mapping, archiveListValidated: true, restoreRehearsed: false }, null, 2))
    for (const statement of migrations[13].sql) if (statement.trim()) await client.query(statement)
    await client.query('insert into drizzle.__drizzle_migrations(hash,created_at) values($1,$2)', [migrations[13].hash,migrations[13].folderMillis])
    await validate()
    assert.deepEqual(await snapshot(), before, 'Existing metadata or business data changed')
    assert.equal(await migrationCount(client), 14)
    await client.query('COMMIT')
    committed = true
    const result = { status: 'committed', migrations: 14, backupDir, preservedLogRows: before.logs.count, metadataPreserved: true, businessDataUnchanged: true }
    writeFileSync(join(backupDir!, 'result.json'), JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result))
  }
} catch (error) {
  console.error(JSON.stringify({ status: 'failed', committed, backupDir, code: (error as { code?: string }).code || 'PREFLIGHT_OR_TOOL_FAILED' }))
  process.exitCode = 1
} finally {
  if (!committed) await client.query('ROLLBACK').catch(() => {})
  client.release()
  await pool.end()
}
