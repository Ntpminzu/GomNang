/** @type {import('next').NextConfig} */
export default {
  experimental: {
  proxyTimeout: 125_000, // 125 giây
},
  // Cho phép mở dev server từ máy khác trong cùng mạng LAN.
  // Next.js sẽ chặn các client bundle bằng 403 nếu hostname này không được khai báo.
  allowedDevOrigins: ['127.0.0.1', '192.168.1.63'],
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  transpilePackages: ['@gomnang/domain'],
  // Proxy /api mặc định cắt sau 30 giây; đánh giá AI bằng model chạy trên máy có thể mất hơn một phút.
  experimental: { proxyTimeout: 150_000 },
  async rewrites() {
    const origin = (process.env.API_ORIGIN ?? 'http://localhost:4000').replace(/\/$/, '')
    return [{ source: '/api/:path*', destination: `${origin}/api/:path*` }]
  },
}
