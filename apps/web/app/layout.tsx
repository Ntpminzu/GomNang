import type { Metadata } from 'next'
import Link from 'next/link'
import { UserSwitcher } from '@/components/UserSwitcher.tsx'
import './globals.css'

export const metadata: Metadata = {
  title: 'GOM NẮNG — nền tảng thiện nguyện cộng đồng',
  description:
    'Kết nối nguồn lực nhỏ lẻ thành dự án thiện nguyện có kế hoạch, có nhu cầu định lượng và có sổ ghi vết minh bạch.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <a className="skip-link" href="#main">
          Bỏ qua điều hướng
        </a>

        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="brand">
              GOM<span>NẮNG</span>
            </Link>
            <nav aria-label="Điều hướng chính">
              <Link href="/">Dự án</Link>
              <Link href="/projects/new">Tạo dự án</Link>
              <Link href="/verify">Hàng chờ xác minh</Link>
            </nav>
            <UserSwitcher />
          </div>
        </header>

        <main id="main" className="container">
          {children}
        </main>

        <footer className="container site-footer">
          Đồ án môn New Technologies in Software Engineering · HK1 2026–2027 · Bản prototype: dữ liệu giả, lưu ngay
          trong trình duyệt của bạn.
        </footer>
      </body>
    </html>
  )
}
