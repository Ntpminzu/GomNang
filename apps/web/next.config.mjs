/** @type {import('next').NextConfig} */
export default {
  // Package domain viết bằng TypeScript thuần, không build sẵn — Next phải tự biên dịch nó.
  transpilePackages: ['@gomnang/domain'],
}
