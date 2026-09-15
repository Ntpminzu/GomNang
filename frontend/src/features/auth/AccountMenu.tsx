'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeftRight, LogOut } from 'lucide-react'
import { clearSession, getSessionUser, type SessionUser } from '@/lib/session.ts'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { withNext } from './auth-redirect.ts'

/** "Võ Tuấn Khanh" → "VK": chữ đầu của từ đầu và từ cuối. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/)
  return ((words[0][0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase()
}

/**
 * Góc phải header: khách thấy Đăng nhập / Đăng ký, người đã đăng nhập thấy menu tài khoản.
 * Phiên nằm trong localStorage nên chỉ đọc được sau khi trang chạy trên trình duyệt — trước đó giữ một ô trống
 * gần cùng cỡ, để HTML hai phía khớp nhau và header không giật.
 */
export function AccountMenu() {
  const pathname = usePathname()
  /** `undefined` = chưa đọc xong phiên; `null` = khách. */
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined)

  useEffect(() => setUser(getSessionUser()), [])

  if (user === undefined) return <div className="h-8 w-36" aria-hidden="true" />

  if (!user) {
    // Đang ở chính trang đăng nhập / đăng ký thì không gắn ?next trỏ về nó.
    const next = pathname === '/login' || pathname === '/register' ? null : pathname
    return (
      <div className="flex items-center gap-1.5">
        <Button asChild variant="ghost" size="sm">
          <Link href={withNext('/login', next)}>Đăng nhập</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/register">Đăng ký</Link>
        </Button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="max-w-44 gap-2 px-1.5 sm:max-w-56">
          <span
            aria-hidden="true"
            className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
          >
            {initials(user.name)}
          </span>
          <span className="sr-only">Tài khoản: </span>
          <span className="truncate">{user.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="grid gap-0.5">
          <span className="truncate text-sm text-foreground">{user.name}</span>
          <span className="font-normal">{user.isVerifier ? 'Người xác minh' : 'Thành viên'}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/login">
            <ArrowLeftRight />
            Đổi tài khoản
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            clearSession()
            window.location.assign('/')
          }}
        >
          <LogOut />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
