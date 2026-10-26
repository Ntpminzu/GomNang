/** @type {import('next').NextConfig} */
export default {
  // Cho phép mở dev server từ máy khác trong cùng mạng LAN.
  // Next.js sẽ chặn các client bundle bằng 403 nếu hostname này không được khai báo.
  allowedDevOrigins: ['127.0.0.1', '192.168.1.63'],
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  transpilePackages: ['@gomnang/domain'],
  // Proxy /api mặc định cắt sau 30 giây; chat chạy model bằng CPU có thể mất tới 5 phút, SSE của US-10 cần >125 giây.
  experimental: { proxyTimeout: 330_000 },
  // Vercel chỉ cài thư viện của fe: kiểm kiểu lúc build bỏ test/E2E (chúng import code backend).
  typescript: { tsconfigPath: 'tsconfig.build.json' },
  async rewrites() {
    const origin = (process.env.API_ORIGIN ?? 'http://localhost:4000').replace(/\/$/, '')
    return [{ source: '/api/:path*', destination: `${origin}/api/:path*` }]
  },
}
