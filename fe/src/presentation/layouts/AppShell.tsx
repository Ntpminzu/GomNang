import { SessionBoundary } from '../providers/SessionProvider.tsx'
import Link from 'next/link'
import { UserSwitcher } from '../modules/auth/index.ts'
import { AuthLinks } from '../modules/auth/components/AuthLinks.tsx'
import { isMockMode } from '../../libs/config/env.ts'
export function AppShell({ children }: { children: React.ReactNode }) {
  return <>
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
            {isMockMode ? <UserSwitcher /> : <AuthLinks />}
          </div>
        </header>

        <main id="main" className="container">
          <SessionBoundary>{children}</SessionBoundary>
        </main>

        <footer className="container site-footer">
          Đồ án môn New Technologies in Software Engineering · HK1 2026–2027 · {isMockMode ? 'Chế độ mock: dữ liệu giả lưu trong trình duyệt.' : 'Dữ liệu được lưu trên máy chủ.'}
        </footer>
  </>
}
