/**
 * Cấu hình đọc từ biến môi trường. Thiếu thứ bắt buộc thì dừng ngay lúc khởi động,
 * thay vì chạy được nửa chừng rồi hỏng ở request đầu tiên.
 */

export type Config = {
  port: number
  env: 'development' | 'production' | 'test'
  jwtSecret: string
  /** Có giá trị = dùng PostgreSQL thật. `null` = dùng PGlite ở `dataDir`. */
  databaseUrl: string | null
  /** Chứng chỉ CA (PEM) để kiểm chứng máy chủ PostgreSQL. */
  databaseCaCert: string | null
  /** Thư mục của PGlite. `null` = database chỉ nằm trong RAM, tắt là mất (dùng cho test). */
  dataDir: string | null
  devLoginEnabled: boolean
  seedOnEmpty: boolean
  /** Origin của web được phép gọi API từ trình duyệt (CORS). */
  corsOrigins: string[]
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const nodeEnv = env.NODE_ENV === 'production' ? 'production' : env.NODE_ENV === 'test' ? 'test' : 'development'

  const jwtSecret = env.JWT_SECRET ?? ''
  if (jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET thiếu hoặc ngắn hơn 32 ký tự. Chép backend/.env.example thành backend/.env rồi điền giá trị.',
    )
  }

  const port = Number(env.PORT ?? 4000)
  if (!Number.isInteger(port) || port <= 0) throw new Error(`PORT không hợp lệ: ${env.PORT}`)

  // Đăng nhập bằng tài khoản mẫu: mặc định tắt ở production. Muốn bật cho bản demo thì phải đặt
  // riêng một biến có tên nói rõ hậu quả — không thể vô tình bật chỉ vì chép nhầm file .env của máy dev.
  const devLoginAllowedHere = nodeEnv !== 'production' || env.ALLOW_DEMO_LOGIN_IN_PRODUCTION === 'true'

  return {
    port,
    env: nodeEnv,
    jwtSecret,
    databaseUrl: env.DATABASE_URL || null,
    databaseCaCert: env.DATABASE_CA_CERT || null,
    dataDir: env.DATA_DIR || '.data/pglite',
    devLoginEnabled: devLoginAllowedHere && env.ENABLE_DEV_LOGIN !== 'false',
    seedOnEmpty: env.SEED_ON_EMPTY !== 'false',
    corsOrigins: (env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim().replace(/\/+$/, ''))
      .filter(Boolean),
  }
}
