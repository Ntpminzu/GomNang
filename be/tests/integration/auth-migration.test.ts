import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'node:test'
import { openPglite } from '../../src/infrastructure/database/pglite.ts'
import { SignJWT } from 'jose'
import { drizzle } from 'drizzle-orm/pglite'
import { authenticate } from '../../src/modules/auth/auth.service.ts'
import * as auth from '../../src/modules/auth/auth.repository.ts'
import type { AuthDeps } from '../../src/modules/auth/auth.types.ts'
const dir = new URL('../../drizzle/', import.meta.url)
async function legacy() {
  const opened = await openPglite(null)
  for (const file of readdirSync(dir).filter((file) => /^000\d_.*\.sql$/.test(file)).sort()) {
    await opened.client.exec(readFileSync(new URL(file, dir), 'utf8'))
  }
  return opened
}
test('US1 migration preserves IDs, identity verification, reviewer role and project references', async () => {
  const { client, close } = await legacy()
  try {
    await client.exec(`INSERT INTO users(id,email,display_name,verified,is_verifier) VALUES
      ('00000000-0000-4000-8000-000000000001','reviewer@legacy.test','Reviewer',true,true),
      ('00000000-0000-4000-8000-000000000002','member@legacy.test','Member',false,false);
      INSERT INTO projects(id,name,goal,beneficiary_group,location,start_date,end_date,coordinator_id)
      VALUES('00000000-0000-4000-8000-000000000003','Legacy project','Goal','Group','Place','2026-10-25','2026-10-26','00000000-0000-4000-8000-000000000001');`)
    await client.exec(readFileSync(new URL('0010_us1_auth.sql', dir), 'utf8'))
    const { rows } = await client.query('select id,identity_verified,role,password_hash,must_change_password from users order by id')
    assert.deepEqual(rows, [
      { id: '00000000-0000-4000-8000-000000000001', identity_verified: true, role: 'verifier', password_hash: null, must_change_password: false },
      { id: '00000000-0000-4000-8000-000000000002', identity_verified: false, role: 'user', password_hash: null, must_change_password: false },
    ])
    assert.equal((await client.query<{ coordinator_id: string }>('select coordinator_id from projects')).rows[0].coordinator_id, rows[0].id)
    await assert.rejects(() => client.exec("insert into users(email,display_name) values ('REVIEWER@legacy.test','Duplicate')"))
  } finally { await close() }
})
test('normalized-email collision aborts migration before schema/data mutation', async () => {
  const { client, close } = await legacy()
  try {
    await client.exec("insert into users(email,display_name) values ('Same@legacy.test','One'),('same@legacy.test','Two')")
    await assert.rejects(() => client.exec(readFileSync(new URL('0010_us1_auth.sql', dir), 'utf8')), /US1_EMAIL_COLLISION/)
    assert.equal((await client.query('select verified,is_verifier from users')).rows.length, 2)
    assert.equal((await client.query("select column_name from information_schema.columns where table_name='users' and column_name='role'")).rows.length, 0)
  } finally { await close() }
})

test('0011 revokes old restricted sessions, preserves full sessions and removes mandatory state', async () => {
  const { client, close } = await legacy()
  const secret = new TextEncoder().encode('migration-only-secret-0123456789abcdef')
  const userId = '00000000-0000-4000-8000-000000000001'
  const fullId = '00000000-0000-4000-8000-000000000002', limitedId = '00000000-0000-4000-8000-000000000003'
  try {
    await client.exec(`INSERT INTO users(id,email,display_name,verified,is_verifier) VALUES ('${userId}','migrate@fixture.test','Reviewer',true,true)`)
    await client.exec(readFileSync(new URL('0010_us1_auth.sql', dir), 'utf8'))
    await client.exec(`UPDATE users SET must_change_password=true WHERE id='${userId}';
      INSERT INTO auth_sessions(id,user_id,purpose,method,expires_at) VALUES
      ('${fullId}','${userId}','full','password',now()+interval '8 hours'),
      ('${limitedId}','${userId}','password_change','password',now()+interval '15 minutes')`)
    await client.exec(readFileSync(new URL('0011_optional_verifier_password.sql', dir), 'utf8'))
    const sessions = (await client.query<{ id: string; revoked_at: string | null }>('select id,revoked_at from auth_sessions order by id')).rows
    assert.equal(sessions[0].revoked_at, null); assert.ok(sessions[1].revoked_at)
    assert.equal((await client.query("select column_name from information_schema.columns where table_name='users' and column_name='must_change_password'")).rows.length, 0)
    assert.equal((await client.query("select column_name from information_schema.columns where table_name='auth_sessions' and column_name='purpose'")).rows.length, 0)
    assert.equal((await client.query("select typname from pg_type where typname='session_purpose'")).rows.length, 0)
    assert.ok((await client.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname in ('auth_sessions','oauth_identities')")).rows.every((row) => row.relrowsecurity))
    const deps = { db: drizzle(client), auth, secret } as unknown as AuthDeps
    const token = (sid: string, extra: Record<string, unknown>) => new SignJWT({ sid, ...extra }).setProtectedHeader({ alg: 'HS256' }).setSubject(userId).setIssuer('gomnang-api').setExpirationTime('1h').sign(secret)
    for (const purpose of [undefined, 'full']) {
      const jwt = await token(fullId, purpose === undefined ? {} : { purpose })
      assert.equal((await authenticate('Bearer ' + jwt, deps))?.user.role, 'verifier')
    }
    for (const purpose of ['password_change', 'unknown', null]) {
      await assert.rejects(() => token(fullId, { purpose }).then((jwt) => authenticate('Bearer ' + jwt, deps)))
    }
    await assert.rejects(() => token(limitedId, {}).then((jwt) => authenticate('Bearer ' + jwt, deps)))
  } finally { await close() }
})
