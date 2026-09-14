import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'

export type Db = PgliteDatabase
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
/** Hàm truy vấn nhận được cả kết nối thường lẫn transaction. */
export type Exec = Db | Tx

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../drizzle', import.meta.url))

// ponytail: PGlite là PostgreSQL thật biên dịch sang WebAssembly, chạy ngay trong tiến trình Node,
// một kết nối duy nhất. Đủ cho dev, test và demo trên lớp mà không phải cài hay bật gì thêm.
// Khi deploy (Homework 4B) đổi sang drizzle-orm/node-postgres với DATABASE_URL của Supabase —
// schema và migration giữ nguyên vì cùng là PostgreSQL.
export async function openDb(dataDir: string | null) {
  // PGlite chỉ tạo đúng thư mục cuối, không tạo thư mục cha — lần chạy đầu tiên sẽ hỏng nếu thiếu dòng này.
  if (dataDir) mkdirSync(dataDir, { recursive: true })
  const client = dataDir ? new PGlite(dataDir) : new PGlite()
  const db = drizzle(client)
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR })
  return { db, close: () => client.close() }
}
