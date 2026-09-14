/** @type {import('next').NextConfig} */
export default {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  transpilePackages: ['@gomnang/domain'],
  async rewrites() {
    const origin = (process.env.API_ORIGIN ?? 'http://localhost:4000').replace(/\/$/, '')
    return [{ source: '/api/:path*', destination: `${origin}/api/:path*` }]
  },
}
