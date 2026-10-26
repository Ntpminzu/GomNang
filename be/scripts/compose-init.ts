// Khởi tạo database của Docker Compose (Postgres + pgvector trong container): migration, dữ liệu mẫu, tài khoản admin/verifier thử.
// Chạy một lần trước backend (service "init"). Từ chối host Supabase: database thật dùng các script db:deploy:* đã review.
import { hashSync } from 'bcryptjs'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { createPool } from '../src/infrastructure/database/postgres.ts'
import { migrationsFolder } from '../src/infrastructure/database/migration-status.ts'
import { seedIfEmpty } from '../src/infrastructure/database/seed.ts'
import * as auth from '../src/modules/auth/auth.repository.ts'
import { passwordValue } from '../src/modules/auth/auth.schema.ts'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL_REQUIRED')
if (/\.supabase\.(?:com|co)$/.test(new URL(url).hostname)) throw new Error('COMPOSE_INIT_REFUSES_SUPABASE')

const pool = createPool(url)
const db = drizzle(pool)
try {
  await migrate(db, { migrationsFolder })
  console.log('migrations applied')
  if (await seedIfEmpty(db)) console.log('demo data seeded')

  // Tài khoản có mật khẩu chỉ tạo khi .env khai báo; mật khẩu không nằm trong repo hay image.
  for (const role of ['admin', 'verifier'] as const) {
    const email = process.env[`DEMO_${role.toUpperCase()}_EMAIL`]?.trim().toLowerCase()
    const password = process.env[`DEMO_${role.toUpperCase()}_PASSWORD`]
    if (!email || !password) continue
    const created = await db.transaction(async (tx) => {
      if (await auth.findAccountByEmail(tx, email)) return false
      await auth.insertAccount(tx, { email, displayName: role === 'admin' ? 'Quản trị Docker' : 'Người xác minh Docker',
        passwordHash: hashSync(passwordValue.parse(password), 10), role, identityVerified: false })
      return true
    })
    console.log(`${role} ${email}: ${created ? 'created' : 'already exists'}`)
  }
} finally {
  await pool.end()
}
