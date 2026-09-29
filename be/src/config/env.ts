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
  geminiApiKey?: string
  geminiModel: string
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

  return {
    port,
    env: nodeEnv,
    jwtSecret,
    dataDir: env.DATA_DIR || '.data/pglite',
    databaseUrl: env.DATABASE_URL || undefined,
    devLoginEnabled: nodeEnv !== 'production' && env.ENABLE_DEV_LOGIN !== 'false',
    seedOnEmpty: env.SEED_ON_EMPTY !== 'false',
    ollamaBaseUrl: (env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, ''),
    ollamaModel: env.OLLAMA_MODEL || 'qwen3:4b',
    ollamaEmbeddingModel: env.OLLAMA_EMBEDDING_MODEL || 'qwen3-embedding:0.6b',
    geminiApiKey: env.GEMINI_API_KEY || undefined,
    geminiModel: env.GEMINI_MODEL || 'gemini-3.8-flash',
  }
}
