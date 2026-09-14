import { defineConfig } from 'drizzle-kit'

// Chỉ dùng cho `npm run db:generate`: đọc schema.ts, sinh file SQL migration vào ./drizzle.
// Server tự chạy các migration này mỗi lần khởi động (src/db/client.ts).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
})
