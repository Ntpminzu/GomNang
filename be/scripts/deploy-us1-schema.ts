import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, statSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import type { PoolClient } from 'pg'
import { createPool } from '../src/infrastructure/database/postgres.ts'

const migrations = readMigrationFiles({ migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) })
const sourceJournal = JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8')) as { entries: Array<{ tag: string }> }
const hashVariants = sourceJournal.entries.map((entry) => {
  const text = readFileSync(new URL('../drizzle/' + entry.tag + '.sql', import.meta.url), 'utf8')
  const lf = text.replaceAll('\r\n', '\n')
  return [text, lf, lf.replaceAll('\n', '\r\n')].map((value) => createHash('sha256').update(value).digest('hex'))
})
const expectedTables = ['assessments','audit_log','chat_chunks','contributions','expenses','need_items','project_updates','projects','users']
const quote = (s: string) => '"' + s.replaceAll('"', '""') + '"'
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const finalProjection = 'id,email,display_name,phone,password_hash,created_at,identity_verified,role'
const oldProjection = "id,email,display_name,phone,password_hash,created_at,verified as identity_verified,case when is_verifier then 'verifier' else 'user' end as role"
const apply = process.argv.includes('--apply')
const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL_REQUIRED')
const target = new URL(url)
if (!target.hostname.endsWith('.supabase.com') && !target.hostname.endsWith('.supabase.co')) throw new Error('SUPABASE_TARGET_REQUIRED')
const pool = createPool(url)
let client: PoolClient | undefined
let backupDir: string | undefined
let inTransaction = false
async function journal() {
  const rows = (await client!.query('select hash,created_at from drizzle.__drizzle_migrations order by created_at')).rows
  assert.ok([10,12].includes(rows.length), 'Unexpected migration baseline; expected 0009 or completed 0011')
  rows.forEach((row, i) => {
    // Windows checkouts may change CRLF/LF bytes; never accept any SQL content change.
    assert.ok(hashVariants[i]?.includes(row.hash), 'Migration content hash mismatch at index ' + i)
    assert.equal(String(row.created_at), String(migrations[i]?.folderMillis), 'Migration timestamp mismatch at index ' + i)
  })
  return rows.length
}
async function snapshot(upgraded: boolean) {
  const result: Record<string, { count: number; digest: string }> = {}
  for (const table of expectedTables) {
    const selection = table === 'users' ? (upgraded ? finalProjection : oldProjection) : '*'
    const rows = (await client!.query('select row_to_json(t) as row from (select ' + selection + ' from public.' + quote(table) + ' order by id) t')).rows.map((r) => r.row)
    result[table] = { count: rows.length, digest: digest(rows) }
  }
  return result
}
async function validateFinal() {
  const columns = (await client!.query("select table_name,column_name from information_schema.columns where table_schema='public' and table_name in ('users','auth_sessions')")).rows
  for (const old of ['must_change_password','verified','is_verifier','purpose']) assert.ok(!columns.some((r) => r.column_name === old), 'Obsolete column remains: ' + old)
  for (const required of ['role','identity_verified','password_hash']) assert.ok(columns.some((r) => r.table_name === 'users' && r.column_name === required))
  assert.equal((await client!.query("select count(*)::int as n from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='session_purpose'")).rows[0].n, 0)
  const rls = (await client!.query("select tablename,rowsecurity from pg_tables where schemaname='public' order by tablename")).rows
  assert.equal(rls.length, 11)
  assert.ok(rls.every((r) => r.rowsecurity), 'All application tables must keep RLS enabled')
  const policies = await client!.query("select count(*)::int as n from pg_policies where schemaname='public' and tablename in ('auth_sessions','oauth_identities')")
  assert.equal(policies.rows[0].n, 0, 'Private auth tables must not have browser policies')
  const constraints = (await client!.query("select conname from pg_constraint where connamespace='public'::regnamespace")).rows.map((r) => r.conname)
  for (const name of ['auth_sessions_user_id_users_id_fk','oauth_identities_user_id_users_id_fk','projects_treasurer_not_coordinator']) assert.ok(constraints.includes(name), 'Missing constraint: ' + name)
  const indexes = (await client!.query("select indexname from pg_indexes where schemaname='public'")).rows.map((r) => r.indexname)
  for (const name of ['users_email_normalized_unique','oauth_identity_subject_unique','oauth_identity_user_unique']) assert.ok(indexes.includes(name), 'Missing index: ' + name)
  return rls
}
function run(binary: string, args: string[], env = process.env) {
  const result = spawnSync(binary, args, { env, encoding: 'utf8', windowsHide: true, timeout: 120_000, maxBuffer: 8 * 1024 * 1024 })
  if (result.status !== 0) throw new Error('BACKUP_TOOL_FAILED: ' + binary.split(/[\\/]/).pop())
  return result.stdout
}
try {
  assert.equal(migrations.length, 12, 'This runner only deploys the reviewed US1 migrations through 0011')
  client = await pool.connect()
  await client.query("SET TIME ZONE 'UTC'")
  await client.query('BEGIN')
  inTransaction = true
  await client.query("SET LOCAL lock_timeout='5s'")
  await client.query("SET LOCAL statement_timeout='60s'")
  await client.query("select pg_advisory_xact_lock(71502026)")
  let version = await journal()
  if (version === 12) {
    await validateFinal()
    console.log(JSON.stringify({ status: 'already_current', migrations: version }))
  } else {
    const names = (await client.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows.map((r) => r.tablename)
    assert.deepEqual(names, expectedTables, 'Unexpected public table set')
    const duplicate = (await client.query('select count(*)::int as n from (select lower(email) from public.users group by lower(email) having count(*)>1) d')).rows[0].n
    assert.equal(duplicate, 0, 'Normalized email collisions require manual resolution')
    const role = (await client.query('select rolbypassrls,rolsuper from pg_roles where rolname=current_user')).rows[0]
    assert.ok(role.rolbypassrls || role.rolsuper, 'Deployment connection must retain backend RLS access')
    // SHARE blocks application writes but permits pg_dump read locks on the same snapshot.
    await client.query('LOCK TABLE ' + [...expectedTables.map((t) => 'public.' + quote(t)), 'drizzle.__drizzle_migrations'].join(',') + ' IN SHARE MODE')
    version = await journal()
    assert.equal(version, 10)
    const before = await snapshot(false)
    if (!apply) {
      console.log(JSON.stringify({ status: 'preview', pending: ['0010_us1_auth','0011_optional_verifier_password'], data: before }, null, 2))
    } else {
      backupDir = fileURLToPath(new URL('../.data/supabase-us1-' + new Date().toISOString().replace(/[:.]/g, '-') + '/', import.meta.url))
      mkdirSync(backupDir, { recursive: true })
      const exported = (await client.query('select pg_export_snapshot() as snapshot')).rows[0].snapshot as string
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
      for (const table of [...expectedTables, '__drizzle_migrations']) assert.ok(contents.includes('TABLE DATA ') && contents.includes(table), 'Missing archive table: ' + table)
      assert.ok(statSync(dumpPath).size > 0)
      const meta = {
        createdAt: new Date().toISOString(), before, archiveBytes: statSync(dumpPath).size,
        archiveListValidated: true, restoreRehearsed: false,
        note: 'Docker/restore rehearsal omitted at user request. This is an application public+drizzle backup, not a full Supabase platform backup.',
      }
      writeFileSync(join(backupDir, 'manifest.json'), JSON.stringify(meta, null, 2))
      await client.query('LOCK TABLE ' + [...expectedTables.map((t) => 'public.' + quote(t)), 'drizzle.__drizzle_migrations'].join(',') + ' IN ACCESS EXCLUSIVE MODE')
      assert.equal(await journal(), 10)
      assert.deepEqual(await snapshot(false), before)
      for (const migration of migrations.slice(10)) {
        for (const statement of migration.sql) if (statement.trim()) await client.query(statement)
        await client.query('insert into drizzle.__drizzle_migrations(hash,created_at) values($1,$2)', [migration.hash, migration.folderMillis])
      }
      assert.equal(await journal(), 12)
      const after = await snapshot(true)
      assert.deepEqual(after, before, 'Business data changed during schema migration')
      const rls = await validateFinal()
      for (const table of ['auth_sessions','oauth_identities']) assert.equal((await client.query('select count(*)::int as n from public.' + quote(table))).rows[0].n, 0)
      await client.query('COMMIT')
      inTransaction = false
      writeFileSync(join(backupDir, 'result.json'), JSON.stringify({ committed: true, after, migrations: 12, rls }, null, 2))
      console.log(JSON.stringify({ status: 'committed', migrations: 12, backupDir, dataUnchanged: true, tables: after, privateAuthRls: true }, null, 2))
    }
  }
  if (inTransaction) { await client.query('ROLLBACK'); inTransaction = false }
} catch (err) {
  if (inTransaction) await client?.query('ROLLBACK').catch(() => {})
  console.error(JSON.stringify({ status: 'failed', code: (err as { code?: string }).code || 'PREFLIGHT_OR_TOOL_FAILED', reason: err instanceof assert.AssertionError ? err.message : err instanceof Error && err.message.startsWith('BACKUP_') ? err.message : 'Deployment stopped; transaction was not committed.', backupDir }))
  process.exitCode = 1
} finally { client?.release(); await pool.end() }
