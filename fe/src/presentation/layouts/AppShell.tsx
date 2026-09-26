'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HandHeart, Menu, ShieldCheck, Sun } from 'lucide-react'
import { isMockMode } from '../../libs/config/env.ts'
import { cn } from '../../libs/utils/cn.ts'
import { Button } from '../components/ui/button.tsx'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet.tsx'
import { AccountMenu } from '../modules/auth/components/AccountMenu.tsx'
import { UserSwitcher } from '../modules/auth/index.ts'
import { ChatWidget } from '../modules/chat/ChatWidget.tsx'
import { SessionBoundary, useSession } from '../providers/SessionProvider.tsx'
import { ThemeToggle } from './ThemeToggle.tsx'

type NavItem = { href: string; label: string; verifierOnly?: boolean }

const NAV: NavItem[] = [
  { href: '/', label: 'Khám phá dự án' },
  { href: '/projects/new', label: 'Tạo dự án' },
  { href: '/verify', label: 'Hàng chờ xác minh', verifierOnly: true },
  { href: '/help', label: 'Hướng dẫn' },
]

const isActive = (pathname: string, href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, revision } = useSession()
  const items = NAV.filter((item) => !item.verifierOnly || user?.isVerifier === true)

  const links = (onNavigate?: () => void) =>
    items.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        aria-current={isActive(pathname, item.href) ? 'page' : undefined}
        className={cn(
          'rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          'aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary',
        )}
      >
        {item.label}
      </Link>
    ))

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Bỏ qua điều hướng
      </a>

      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-bold tracking-wide">
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-sun/90 text-foreground shadow-sm">
              <Sun className="size-5" />
            </span>
            <span className="text-lg">
              GOM <span className="text-primary">NẮNG</span>
            </span>
          </Link>

          <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 lg:flex">
            {links()}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            {isMockMode ? <UserSwitcher /> : <AccountMenu />}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-lg" className="lg:hidden" aria-label="Mở menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav aria-label="Điều hướng chính trên điện thoại" className="flex flex-col gap-1 px-4">
                  {links()}
                </nav>
                <div className="mt-4 flex items-center justify-between border-t px-4 pt-4 text-sm text-muted-foreground sm:hidden">
                  Giao diện sáng / tối
                  <ThemeToggle />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl px-4 pt-8 pb-20">
        <SessionBoundary>{children}</SessionBoundary>
      </main>

      <footer className="border-t bg-card/50">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
          <div className="space-y-2">
            <p className="font-semibold">GOM NẮNG</p>
            <p className="font-display text-base text-muted-foreground italic">Góp một chút nắng. Cùng làm điều tốt.</p>
          </div>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex gap-2">
              <HandHeart className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              Nhu cầu định lượng: biết chính xác còn thiếu gì.
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              Dự án được xác minh trước khi kêu gọi; mọi thay đổi đều có sổ ghi vết.
            </li>
          </ul>
          <p className="text-muted-foreground sm:text-right">
            {isMockMode ? 'Bản trải nghiệm · dữ liệu mẫu trong trình duyệt.' : 'Đồ án môn New Technologies in Software Engineering · HCMUTE.'}
            <br />
            Nền tảng không giữ tiền: đóng góp chuyển thẳng cho người phụ trách tài chính đã xác minh.
          </p>
        </div>
      </footer>
      <ChatWidget key={revision} />
    </>
  )
}
