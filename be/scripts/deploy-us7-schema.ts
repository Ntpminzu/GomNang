import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPool } from '../src/infrastructure/database/postgres.ts'
import { localMigrations, migrationCount } from '../src/infrastructure/database/migration-status.ts'

// Runner riêng: chỉ thêm 0012, không reset/seed hoặc triển khai lại US1.
const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL_REQUIRED')
const target = new URL(url)
if (!target.hostname.endsWith('.supabase.com') && !target.hostname.endsWith('.supabase.co')) throw new Error('SUPABASE_TARGET_REQUIRED')
const apply = process.argv.includes('--apply')
const migrations = localMigrations()
assert.equal(migrations.length, 13, 'This runner only deploys the reviewed US7 migration 0012')
assert.equal(migrations[12].tag, '0012_us7_chat_requests')
const existingTables = ['assessments', 'audit_log', 'auth_sessions', 'chat_chunks', 'contributions', 'expenses', 'need_items', 'oauth_identities', 'project_updates', 'projects', 'users']
const quote = (value: string) => '"' + value.replaceAll('"', '""') + '"'
const pool = createPool(url)
const client = await pool.connect()
let inTransaction = false
let committed = false
let backupDir: string | undefined

async function snapshot() {
  const result: Record<string, { count: number; digest: string }> = {}
  for (const table of existingTables) {
    const rows = (await client.query(`select row_to_json(t) as row from (select * from public.${quote(table)} order by id) t`)).rows.map((row) => row.row)
    result[table] = { count: rows.length, digest: createHash('sha256').update(JSON.stringify(rows)).digest('hex') }
  }
  return result
}

async function validateLogTable() {
  const table = (await client.query("select relrowsecurity from pg_class where oid='public.chat_requests'::regclass")).rows[0]
  assert.equal(table?.relrowsecurity, true, 'chat_requests must have RLS enabled')
  assert.equal((await client.query("select count(*)::int as n from pg_policies where schemaname='public' and tablename='chat_requests'")).rows[0].n, 0, 'No browser policies on chat_requests')
  for (const role of ['anon', 'authenticated']) {
    const exists = (await client.query('select 1 from pg_roles where rolname=$1', [role])).rowCount
    if (exists) {
      const permissions = (await client.query("select has_table_privilege($1,'public.chat_requests','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as allowed", [role])).rows[0]
      assert.equal(permissions.allowed, false, 'Browser role must have no log-table privileges')
    }
  }
  const columns = (await client.query("select column_name from information_schema.columns where table_schema='public' and table_name='chat_requests' order by ordinal_position")).rows.map((row) => row.column_name)
  assert.deepEqual(columns, ['id','request_id','requested_provider','requested_model','actual_model','embedding_model','prompt_version','query_prompt_version','lifecycle','status','reason_code','http_status','origin','model_calls','embedding_calls','embedded_documents','input_tokens','output_tokens','thinking_tokens','total_tokens','started_at','finished_at','latency_ms'])
  const indexes = (await client.query("select indexname from pg_indexes where schemaname='public' and tablename='chat_requests'")).rows.map((row) => row.indexname)
  for (const name of ['chat_requests_pkey', 'chat_requests_request_id_idx', 'chat_requests_started_at_idx']) assert.ok(indexes.includes(name), 'Missing log index: ' + name)
}

function run(binary: string, args: string[], env = process.env) {
  const result = spawnSync(binary, args, { env, encoding: 'utf8', windowsHide: true, timeout: 120_000, maxBuffer: 8 * 1024 * 1024 })
  if (result.status !== 0) throw new Error('BACKUP_TOOL_FAILED')
  return result.stdout
}

try {
  await client.query("SET TIME ZONE 'UTC'")
  await client.query('BEGIN')
  inTransaction = true
  await client.query("SET LOCAL lock_timeout='5s'")
  await client.query("SET LOCAL statement_timeout='60s'")
  await client.query('select pg_advisory_xact_lock(71502026)')
  const count = await migrationCount(client)
  assert.ok(count === 12 || count === 13, 'Expected completed US1 baseline (0011) or current US7 (0012)')
  const names = (await client.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows.map((row) => row.tablename)
  assert.deepEqual(names, [...existingTables, ...(count === 13 ? ['chat_requests'] : [])].sort(), 'Unexpected public schema; inspect before deploying')
  const role = (await client.query('select rolbypassrls,rolsuper from pg_roles where rolname=current_user')).rows[0]
  assert.ok(role.rolbypassrls || role.rolsuper, 'Deployment/backend role must retain RLS access')
  if (count === 13) {
    await validateLogTable()
    console.log(JSON.stringify({ status: 'already_current', migrations: 13, privateLogTable: true }))
  } else {
    const before = await snapshot()
    if (!apply) {
      console.log(JSON.stringify({ status: 'preview', target: 'Supabase configured in be/.env', pending: ['0012_us7_chat_requests'], existingData: before, action: 'Add private metadata table, indexes and migration journal entry only' }, null, 2))
    } else {
      // Giữ dữ liệu ổn định trong backup và migration; không chạy model/embedding ở transaction này.
      await client.query('LOCK TABLE ' + [...existingTables.map((name) => 'public.' + quote(name)), 'drizzle.__drizzle_migrations'].join(',') + ' IN SHARE MODE')
      assert.equal(await migrationCount(client), 12)
      assert.deepEqual(await snapshot(), before, 'Data changed since preflight; rerun deployment')
      const exported = (await client.query('select pg_export_snapshot() as snapshot')).rows[0].snapshot as string
      backupDir = fileURLToPath(new URL('../.data/supabase-us7-' + new Date().toISOString().replace(/[:.]/g, '-') + '/', import.meta.url))
      mkdirSync(backupDir, { recursive: true })
      const dumpPath = join(backupDir, 'application.dump')
      const pgBin = process.env.PG_BIN || 'C:/Program Files/PostgreSQL/18/bin'
      const env = {
        ...process.env, PGHOST: target.hostname, PGPORT: target.port || '5432',
        PGUSER: decodeURIComponent(target.username), PGPASSWORD: decodeURIComponent(target.password),
        PGDATABASE: decodeURIComponent(target.pathname.slice(1)), PGSSLMODE: 'verify-full',
        PGSSLROOTCERT: fileURLToPath(new URL('../certs/prod-ca-2021.crt', import.meta.url)),
      }
      run(join(pgBin, 'pg_dump.exe'), ['--no-password','--format=custom','--schema=public','--schema=drizzle','--snapshot=' + exported,'--lock-wait-timeout=5s','--file=' + dumpPath], env)
      const contents = run(join(pgBin, 'pg_restore.exe'), ['--list', dumpPath])
      for (const name of [...existingTables, '__drizzle_migrations']) {
        assert.ok(contents.split('\n').some((line) => line.includes('TABLE DATA ') && line.includes(' ' + name + ' ')), 'Archive table data missing: ' + name)
      }
      assert.ok(statSync(dumpPath).size > 0, 'Backup archive is empty')
      writeFileSync(join(backupDir, 'manifest.json'), JSON.stringify({ createdAt: new Date().toISOString(), before, archiveBytes: statSync(dumpPath).size, archiveListValidated: true, restoreRehearsed: false, scope: 'Application public+drizzle schemas; not full Supabase platform backup' }, null, 2))
      for (const statement of migrations[12].sql) if (statement.trim()) await client.query(statement)
      await client.query('insert into drizzle.__drizzle_migrations(hash,created_at) values($1,$2)', [migrations[12].hash, migrations[12].folderMillis])
      assert.equal(await migrationCount(client), 13)
      await validateLogTable()
      assert.equal((await client.query('select count(*)::int as n from public.chat_requests')).rows[0].n, 0)
      assert.deepEqual(await snapshot(), before, 'Existing application data changed')
      await client.query('COMMIT')
      inTransaction = false
      committed = true
      writeFileSync(join(backupDir, 'result.json'), JSON.stringify({ committed, migrations: 13, dataUnchanged: true, privateLogTable: true }, null, 2))
      console.log(JSON.stringify({ status: 'committed', migrations: 13, backupDir, dataUnchanged: true, privateLogTable: true }, null, 2))
    }
  }
} catch (error) {
  console.error(JSON.stringify({ status: committed ? 'committed_but_report_failed' : 'failed', code: (error as { code?: string }).code || 'PREFLIGHT_OR_TOOL_FAILED', reason: error instanceof assert.AssertionError ? error.message : 'Deployment stopped. Inspect safely without logging SQL parameters or connection secrets.', committed, backupDir }))
  process.exitCode = 1
} finally {
  if (inTransaction) await client.query('ROLLBACK').catch(() => {})
  client.release()
  await pool.end()
}
