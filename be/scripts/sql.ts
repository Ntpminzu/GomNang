/**
 * Chạy một câu SQL thẳng vào database local — để xem trạng thái dữ liệu khi demo trên lớp.
 *
 *   npm run sql -w gomnang-api -- "select name, status from projects"
 *
 * PHẢI TẮT SERVER TRƯỚC. PGlite chỉ cho một tiến trình mở thư mục dữ liệu tại một thời điểm;
 * lệnh sẽ từ chối mở nếu server đang giữ khóa database.
 */
import { existsSync } from 'node:fs'
import { openPglite } from '../src/infrastructure/database/pglite.ts'

const statement = process.argv.slice(2).join(' ').trim()
if (!statement) {
  console.error('Cách dùng: npm run sql -w gomnang-api -- "select name, status from projects"')
  process.exit(1)
}

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
