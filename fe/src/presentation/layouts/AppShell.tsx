'use client'

import { usePathname } from 'next/navigation'
import { SessionBoundary, useSession } from '../providers/SessionProvider.tsx'
import Link from 'next/link'
import { UserSwitcher } from '../modules/auth/index.ts'
import { AuthLinks } from '../modules/auth/components/AuthLinks.tsx'
import { isMockMode } from '../../libs/config/env.ts'
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useSession()
  return <>
        <a className="skip-link" href="#main">
          Bỏ qua điều hướng
        </a>

        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="brand">
              <span className="brand-sun" aria-hidden="true" />
              GOM<span>NẮNG</span>
            </Link>
            <nav aria-label="Điều hướng chính">
                            <Link href="/" aria-current={pathname === '/' ? 'page' : undefined}>Dự án</Link>
              <Link href="/projects/new" aria-current={pathname === '/projects/new' ? 'page' : undefined}>Tạo dự án</Link>
              {user?.isVerifier === true && (
                <Link href="/verify" aria-current={pathname === '/verify' ? 'page' : undefined}>Hàng chờ xác minh</Link>
              )}
            </nav>
            {isMockMode ? <UserSwitcher /> : <AuthLinks />}
          </div>
        </header>

        <main id="main" className="container">
          <SessionBoundary>{children}</SessionBoundary>
        </main>

        <footer className="container site-footer">
          <div><strong>GOM NẮNG</strong><p>Góp một chút nắng. Cùng làm điều tốt.</p></div>
          <p>{isMockMode ? 'Bản trải nghiệm · Dữ liệu mẫu trong trình duyệt.' : 'Kết nối cộng đồng · Đóng góp minh bạch.'}</p>
        </footer>
  </>
}
