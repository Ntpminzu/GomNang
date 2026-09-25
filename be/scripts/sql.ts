/**
 * Chạy SQL trên DATABASE_URL nếu có; nếu không thì dùng database PGlite local.
 *
 *   npm run sql -w gomnang-api -- "select name, status from projects"
 *
 * Với PGlite, PHẢI TẮT SERVER TRƯỚC. Chỉ một tiến trình được mở thư mục dữ liệu tại một thời điểm;
 * lệnh sẽ từ chối mở nếu server đang giữ khóa database.
 */
import { existsSync } from 'node:fs'
import { openPglite } from '../src/infrastructure/database/pglite.ts'
import { createPool } from '../src/infrastructure/database/postgres.ts'

const statement = process.argv.slice(2).join(' ').trim()
if (!statement) {
  console.error('Cách dùng: npm run sql -w gomnang-api -- "select name, status from projects"')
  process.exit(1)
}

if (process.env.DATABASE_URL) {
  const pool = createPool(process.env.DATABASE_URL)
  try {
    const result = await pool.query(statement)
    console.table(result.rows)
  } catch (error) {
    console.error('PostgreSQL:', (error as Error).message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
} else {
const dataDir = process.env.DATA_DIR || '.data/pglite'
if (!existsSync(dataDir)) {
  console.error(`Chưa có database ở ${dataDir}. Chạy server một lần để tạo.`)
  process.exit(1)
}

console.error('Nhắc lại: server phải đang TẮT.\n')
const { client: db, close } = await openPglite(dataDir)
try {
  const result = await db.query(statement)
  if (result.rows.length > 0) console.table(result.rows)
  else console.log(`Xong. Số dòng bị ảnh hưởng: ${result.affectedRows ?? 0}`)
} catch (err) {
  console.error(`PostgreSQL từ chối: ${(err as Error).message}`)
  process.exitCode = 1
} finally {
  await close()
}
}
