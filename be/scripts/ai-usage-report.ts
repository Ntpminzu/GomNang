import { sql } from 'drizzle-orm'
import { loadConfig } from '../src/config/env.ts'
import { openDb } from '../src/infrastructure/database/client.ts'

/**
 * Tổng hợp bảng ai_requests: số lần gọi, tỉ lệ lỗi, thời gian và chi phí trung bình mỗi lần (đề mục 4.2).
 *   npm run ai:usage -w gomnang-api
 * Với PGlite cục bộ phải tắt backend trước (một tiến trình giữ database). Dashboard admin (US-9) đọc cùng bảng này.
 */
const config = loadConfig()
const { db, close } = await openDb(config.dataDir, config.databaseUrl)
try {
  const { rows } = await db.execute(sql`
    select feature, provider, model, prompt_version,
           count(*)::int as requests,
           count(*) filter (where outcome <> 'ok')::int as failed,
           round(avg(latency_ms))::int as avg_latency_ms,
           round(avg(input_tokens))::int as avg_input_tokens,
           round(avg(output_tokens))::int as avg_output_tokens,
           avg(cost_usd) as avg_cost_usd,
           sum(cost_usd) as total_cost_usd
    from ai_requests group by 1, 2, 3, 4 order by 1, 2, 3, 4`)
  console.table(rows)
} finally {
  await close()
}
