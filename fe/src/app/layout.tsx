import { SessionProvider } from '@/presentation/providers/SessionProvider.tsx'
import type { Metadata } from 'next'
import { AppShell } from '@/presentation/layouts/AppShell.tsx'
import '@/presentation/styles/globals.css'
export const metadata: Metadata = {
  title: 'GOM NẮNG — nền tảng thiện nguyện cộng đồng',
  description:
    'Kết nối nguồn lực nhỏ lẻ thành dự án thiện nguyện có kế hoạch, có nhu cầu định lượng và có sổ ghi vết minh bạch.',
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="vi"><body><SessionProvider><AppShell>{children}</AppShell></SessionProvider></body></html>
}
