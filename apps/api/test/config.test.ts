import assert from 'node:assert/strict'
import test from 'node:test'
import { loadConfig } from '../src/config.ts'

const SECRET = 'x'.repeat(32)

test('thiếu JWT_SECRET hoặc quá ngắn thì không khởi động', () => {
  assert.throws(() => loadConfig({}), /JWT_SECRET/)
  assert.throws(() => loadConfig({ JWT_SECRET: 'ngan' }), /JWT_SECRET/)
})

test('production: đăng nhập mẫu tắt, kể cả khi chép nhầm ENABLE_DEV_LOGIN=true từ máy dev', () => {
  const config = loadConfig({ JWT_SECRET: SECRET, NODE_ENV: 'production', ENABLE_DEV_LOGIN: 'true' })
  assert.equal(config.devLoginEnabled, false)
})

test('production: chỉ bật đăng nhập mẫu khi ALLOW_DEMO_LOGIN_IN_PRODUCTION đúng bằng "true"', () => {
  const base = { JWT_SECRET: SECRET, NODE_ENV: 'production' }
  assert.equal(loadConfig({ ...base, ALLOW_DEMO_LOGIN_IN_PRODUCTION: 'true' }).devLoginEnabled, true)
  assert.equal(loadConfig({ ...base, ALLOW_DEMO_LOGIN_IN_PRODUCTION: 'yes' }).devLoginEnabled, false)
  assert.equal(
    loadConfig({ ...base, ALLOW_DEMO_LOGIN_IN_PRODUCTION: 'true', ENABLE_DEV_LOGIN: 'false' }).devLoginEnabled,
    false,
    'ENABLE_DEV_LOGIN=false vẫn tắt được',
  )
})

test('không có DATABASE_URL thì dùng PGlite; có thì dùng PostgreSQL thật', () => {
  assert.equal(loadConfig({ JWT_SECRET: SECRET, DATABASE_URL: '' }).databaseUrl, null)
  assert.equal(loadConfig({ JWT_SECRET: SECRET, DATABASE_URL: 'postgres://u:p@h:5432/d' }).databaseUrl, 'postgres://u:p@h:5432/d')
})

test('CORS_ORIGINS bỏ khoảng trắng và dấu / ở cuối', () => {
  const config = loadConfig({ JWT_SECRET: SECRET, CORS_ORIGINS: ' https://gomnang.vercel.app/ , http://localhost:3000' })
  assert.deepEqual(config.corsOrigins, ['https://gomnang.vercel.app', 'http://localhost:3000'])
})
