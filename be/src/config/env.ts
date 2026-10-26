/**
 * Cấu hình đọc từ biến môi trường. Thiếu thứ bắt buộc thì dừng ngay lúc khởi động,
 * thay vì chạy được nửa chừng rồi hỏng ở request đầu tiên.
 */

export type Config = {
  port: number
  env: 'development' | 'production' | 'test'
  jwtSecret: string
  /** `null` = database chỉ nằm trong RAM, tắt là mất (dùng cho test). */
  dataDir: string | null
  databaseUrl?: string
  devLoginEnabled: boolean
  seedOnEmpty: boolean
  ollamaBaseUrl: string
  ollamaModel: string
  ollamaEmbeddingModel: string
  ollamaChatThink: boolean
  google?: { clientId: string; clientSecret: string; origin: string }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const nodeEnv = env.NODE_ENV === 'production' ? 'production' : env.NODE_ENV === 'test' ? 'test' : 'development'

  const jwtSecret = env.JWT_SECRET ?? ''
  if (jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET thiếu hoặc ngắn hơn 32 ký tự. Chép be/.env.example thành be/.env rồi điền giá trị.',
    )
  }

  const port = Number(env.PORT ?? 4000)
  if (!Number.isInteger(port) || port <= 0) throw new Error(`PORT không hợp lệ: ${env.PORT}`)
  let google: Config['google']
  if (env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_SECRET) {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.FRONTEND_ORIGIN) throw new Error('Google cần GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET và FRONTEND_ORIGIN.')
    const origin = new URL(env.FRONTEND_ORIGIN)
    if (origin.origin !== env.FRONTEND_ORIGIN || origin.username || origin.password || (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname)))) throw new Error('FRONTEND_ORIGIN phải là origin HTTPS hoặc HTTP localhost, không có path.')
    google = { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, origin: origin.origin }
  }

  return {
    port,
    google,
    env: nodeEnv,
    jwtSecret,
    dataDir: env.DATA_DIR || '.data/pglite',
    databaseUrl: env.DATABASE_URL || undefined,
    devLoginEnabled: nodeEnv !== 'production' && env.ENABLE_DEV_LOGIN !== 'false',
    seedOnEmpty: env.SEED_ON_EMPTY !== 'false',
    ollamaBaseUrl: (env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, ''),
    ollamaModel: env.OLLAMA_MODEL || 'qwen3:4b',
    ollamaEmbeddingModel: env.OLLAMA_EMBEDDING_MODEL || 'qwen3-embedding:0.6b',
    ollamaChatThink: env.OLLAMA_CHAT_THINK !== 'false',
  }
}
