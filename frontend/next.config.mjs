import { fileURLToPath } from 'node:url'

/** @type {import('next').NextConfig} */
export default {
  // Package domain viết bằng TypeScript thuần, không build sẵn — Next phải tự biên dịch nó.
  transpilePackages: ['@gomnang/shared'],

  // Docker: gom server tối thiểu vào .next/standalone. Chỉ bật khi build image (xem frontend/Dockerfile);
  // `npm run dev`, build trên máy và Vercel không cần.
  ...(process.env.BUILD_STANDALONE === '1' && {
    output: 'standalone',
    // Repo là monorepo: truy vết file từ thư mục gốc để bản standalone có cả shared.
    outputFileTracingRoot: fileURLToPath(new URL('../', import.meta.url)),
  }),
}
