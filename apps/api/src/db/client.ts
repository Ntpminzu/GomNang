import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'
import pg from 'pg'

/** Kiểu chung cho cả hai driver — repo.ts và route không cần biết đang chạy trên PGlite hay PostgreSQL thật. */
export type Db = PgDatabase<PgQueryResultHKT>
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
/** Hàm truy vấn nhận được cả kết nối thường lẫn transaction. */
export type Exec = Db | Tx

export type OpenedDb = { db: Db; close: () => Promise<void> }

const MIGRATIONS_DIR = fileURLToPath(new URL('../../drizzle', import.meta.url))

// ponytail: PGlite là PostgreSQL thật biên dịch sang WebAssembly, chạy ngay trong tiến trình Node,
// một kết nối duy nhất. Đủ cho dev, test và demo trên lớp mà không phải cài hay bật gì thêm.
// Docker Compose và bản deploy dùng openPostgres() bên dưới — cùng schema, cùng migration.
export async function openDb(dataDir: string | null): Promise<OpenedDb> {
  // PGlite chỉ tạo đúng thư mục cuối, không tạo thư mục cha — lần chạy đầu tiên sẽ hỏng nếu thiếu dòng này.
  if (dataDir) mkdirSync(dataDir, { recursive: true })
  const client = dataDir ? new PGlite(dataDir) : new PGlite()
  const db = drizzlePglite(client)
  await migratePglite(db, { migrationsFolder: MIGRATIONS_DIR })
  return { db, close: () => client.close() }
}

export type TlsMode = 'off' | 'verified' | 'unverified'

/**
 * PostgreSQL thật qua DATABASE_URL — Docker Compose và bản deploy (Supabase).
 *
 * TLS do hàm này quyết định, không để driver tự đọc `sslmode` từ URL:
 *   - URL có `?sslmode=disable` → tắt TLS (chỉ dùng cho Postgres trong Docker Compose, không mở cổng ra ngoài)
 *   - có `caCert` → bật TLS và kiểm chứng chứng chỉ máy chủ
 *   - còn lại → bật TLS nhưng không kiểm chứng chứng chỉ (vẫn mã hoá, nhưng không chống được giả mạo máy chủ)
 */
export async function openPostgres(databaseUrl: string, caCert: string | null): Promise<OpenedDb & { tls: TlsMode }> {
  const url = new URL(databaseUrl)
  const disabled = url.searchParams.get('sslmode') === 'disable'
  url.searchParams.delete('sslmode')

  const tls: TlsMode = disabled ? 'off' : caCert ? 'verified' : 'unverified'
  const pool = new pg.Pool({
    connectionString: url.toString(),
    ssl: tls === 'off' ? false : tls === 'verified' ? { ca: caCert! } : { rejectUnauthorized: false },
    // Gói miễn phí của Supabase giới hạn số kết nối; một instance API không cần nhiều hơn.
    max: 5,
  })

  try {
    const db = drizzlePg(pool)
    await migratePg(db, { migrationsFolder: MIGRATIONS_DIR })
    return { db, close: () => pool.end(), tls }
  } catch (err) {
    await pool.end()
    throw err
  }
}
