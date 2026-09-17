import { SessionProvider } from '@/presentation/providers/SessionProvider.tsx'
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { AppShell } from '@/presentation/layouts/AppShell.tsx'
import '@/presentation/styles/globals.css'
const bodyFont = localFont({
  src: [
    { path: './fonts/BeVietnamPro-Regular.ttf', weight: '400', style: 'normal' },
    { path: './fonts/BeVietnamPro-SemiBold.ttf', weight: '600', style: 'normal' },
  ],
  variable: '--font-body',
  display: 'swap',
})
const displayFont = localFont({
  src: [
    { path: './fonts/Lora-Regular.ttf', weight: '400 700', style: 'normal' },
    { path: './fonts/Lora-Italic.ttf', weight: '400 700', style: 'italic' },
  ],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'GOM NẮNG — nền tảng thiện nguyện cộng đồng',
  description:
    'Kết nối nguồn lực nhỏ lẻ thành dự án thiện nguyện có kế hoạch, có nhu cầu định lượng và có sổ ghi vết minh bạch.',
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="vi" className={`${bodyFont.variable} ${displayFont.variable}`}><body><SessionProvider><AppShell>{children}</AppShell></SessionProvider></body></html>
}
