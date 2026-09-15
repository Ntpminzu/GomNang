import type { Metadata } from 'next'
import Link from 'next/link'
import { Be_Vietnam_Pro } from 'next/font/google'
import { Sun } from 'lucide-react'
import { ThemeProvider } from 'next-themes'
import { ThemeToggle } from '@/components/theme-toggle.tsx'
import { UserSwitcher } from '@/features/auth/UserSwitcher.tsx'
import './globals.css'

// Font có đủ dấu tiếng Việt. next/font tải font về lúc build và phục vụ cùng web — trình duyệt không gọi Google.
const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-be-vietnam',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'GOM NẮNG — nền tảng thiện nguyện cộng đồng',
  description:
    'Kết nối nguồn lực nhỏ lẻ thành dự án thiện nguyện có kế hoạch, có nhu cầu định lượng và có sổ ghi vết minh bạch.',
}

const NAV = [
  { href: '/', label: 'Dự án' },
  { href: '/projects/new', label: 'Tạo dự án' },
  { href: '/verify', label: 'Hàng chờ xác minh' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes gắn class "dark" lên <html> trước khi React chạy, nên HTML hai phía lệch nhau có chủ đích.
    <html lang="vi" className={beVietnam.variable} suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            Bỏ qua điều hướng
          </a>

          <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
              <Link href="/" className="flex items-center gap-2 text-base font-bold tracking-wide">
                <span
                  aria-hidden="true"
                  className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm"
                >
                  <Sun className="size-4" />
                </span>
                <span>
                  GOM <span className="text-primary">NẮNG</span>
                </span>
              </Link>

              <nav aria-label="Điều hướng chính" className="flex flex-wrap items-center gap-1 text-sm">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="ml-auto flex items-center gap-2">
                <UserSwitcher />
                <ThemeToggle />
              </div>
            </div>
          </header>

          <main id="main" className="mx-auto w-full max-w-5xl px-4 pt-8 pb-16">
            {children}
          </main>

          <footer className="border-t">
            <p className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-muted-foreground">
              Đồ án môn New Technologies in Software Engineering · HK1 2026–2027 · Bản thử nghiệm: toàn bộ là dữ liệu
              mẫu, không có thông tin của người thật.
            </p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}
