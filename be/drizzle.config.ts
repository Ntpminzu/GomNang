import { defineConfig } from 'drizzle-kit'

// Chỉ dùng cho `npm run db:generate`: đọc schema.ts, sinh file SQL migration vào ./drizzle.
// PostgreSQL triển khai riêng; startup chỉ kiểm journal. PGlite vẫn tự migrate khi mở.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/database/schema.ts',
  out: './drizzle',
})
