import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'

const oldSql = readFileSync(new URL('../../drizzle/0012_us7_chat_requests.sql', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../../drizzle/0013_chat_log_sequence.sql', import.meta.url), 'utf8')
const usageMigration = readFileSync(new URL('../../drizzle/0014_chat_embedding_tokens.sql', import.meta.url), 'utf8')
const seed = `INSERT INTO chat_requests
  (id,request_id,embedding_model,prompt_version,query_prompt_version,lifecycle,status,reason_code,http_status,started_at,finished_at,latency_ms)
  VALUES ('00000000-0000-4000-8000-000000000002','old-b','fixture','v1','q1','completed','refused','NO_EVIDENCE',200,'2026-01-02','2026-01-02',2),
         ('00000000-0000-4000-8000-000000000001','old-a','fixture','v1','q1','completed','answered','RAG_ANSWERED',200,'2026-01-01','2026-01-01',1)`

test('0014 preserves every old metadata value, identity and RLS; old usage remains null', async () => {
  const db = new PGlite()
  try {
    await db.exec(oldSql); await db.exec(seed); await db.exec(migration)
    const before = await db.query('select to_jsonb(t) as row from chat_requests t order by request_id')
    await db.exec(usageMigration)
    const after = await db.query("select to_jsonb(t) - 'embedding_tokens' as row from chat_requests t order by request_id")
    assert.deepEqual(after.rows, before.rows)
    assert.deepEqual((await db.query('select embedding_tokens from chat_requests')).rows, [{ embedding_tokens: null }, { embedding_tokens: null }])
    const column = await db.query("select data_type,is_nullable from information_schema.columns where table_name='chat_requests' and column_name='embedding_tokens'")
    assert.deepEqual(column.rows, [{ data_type: 'integer', is_nullable: 'YES' }])
    assert.equal((await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where oid='chat_requests'::regclass")).rows[0].relrowsecurity, true)
    const inserted = await db.query<{ request_id: number }>(`insert into chat_requests
      (embedding_model,prompt_version,query_prompt_version,status,reason_code,http_status,started_at,finished_at,latency_ms,embedding_tokens)
      values ('fixture','v1','q1','answered','RAG_ANSWERED',200,now(),now(),1,0) returning request_id`)
    assert.equal(inserted.rows[0].request_id, 3)
  } finally { await db.close() }
})

test('log migration preserves completed metadata, renumbers chronologically and continues identity after concurrent inserts', async () => {
  const db = new PGlite()
  try {
    await db.exec(oldSql)
    await db.exec(seed)
    await db.exec(migration)
    const rows = await db.query('select request_id,status,reason_code,latency_ms from chat_requests order by request_id')
    assert.deepEqual(rows.rows, [
      { request_id: 1, status: 'answered', reason_code: 'RAG_ANSWERED', latency_ms: 1 },
      { request_id: 2, status: 'refused', reason_code: 'NO_EVIDENCE', latency_ms: 2 },
    ])
    const insert = () => db.query<{ request_id: number }>(`INSERT INTO chat_requests
      (embedding_model,prompt_version,query_prompt_version,status,reason_code,http_status,started_at,finished_at,latency_ms)
      VALUES ('fixture','v1','q1','failed','CHAT_TIMEOUT',504,now(),now(),10) RETURNING request_id`)
    const generated = await Promise.all([insert(), insert()])
    assert.deepEqual(generated.map((result) => result.rows[0].request_id).sort(), [3, 4])
    const columns = await db.query<{ column_name: string }>("select column_name from information_schema.columns where table_name='chat_requests'")
    for (const name of ['id', 'lifecycle', 'embedded_documents', 'legacy_request_id']) {
      assert.ok(!columns.rows.some((row) => row.column_name === name))
    }
    await assert.rejects(db.exec("INSERT INTO chat_requests(request_id) VALUES(99)"))
    const rls = await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where oid='chat_requests'::regclass")
    assert.equal(rls.rows[0].relrowsecurity, true)
  } finally { await db.close() }
})

test('migration refuses incomplete pending rows without losing legacy columns or data', async () => {
  const db = new PGlite()
  try {
    await db.exec(oldSql)
    await db.exec("INSERT INTO chat_requests(id,request_id,embedding_model,prompt_version,query_prompt_version,started_at) VALUES('00000000-0000-4000-8000-000000000001','old-pending','fixture','v1','q1',now())")
    await db.exec('BEGIN')
    await assert.rejects(db.exec(migration), /CHAT_LOG_INCOMPLETE_ROWS_REQUIRE_REVIEW/)
    await db.exec('ROLLBACK')
    const rows = await db.query('select request_id,lifecycle from chat_requests')
    assert.deepEqual(rows.rows, [{ request_id: 'old-pending', lifecycle: 'pending' }])
  } finally { await db.close() }
})
