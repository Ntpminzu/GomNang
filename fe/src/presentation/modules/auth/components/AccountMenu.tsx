'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { saveSession } from '../../../../libs/session/index.ts'
import { Button } from '../../../components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu.tsx'
import { useSession } from '../../../providers/SessionProvider.tsx'

/** Chữ cái đầu của họ và tên cuối — "Võ Tuấn Khanh" → "VK". */
export const initials = (name: string) => {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function AccountMenu() {
  const { user, ready } = useSession()
  const pathname = usePathname()

  // Chưa đọc xong phiên: giữ chỗ cùng kích thước để header không nhảy.
  if (!ready) return <div className="h-9 w-40" aria-hidden="true" />

  if (!user) {
    const next = pathname === '/login' || pathname === '/register' ? '' : `?next=${encodeURIComponent(pathname)}`
    return (
      <div className="flex items-center gap-1.5">
        <Button asChild variant="ghost" className="sm:h-9">
          <Link href={`/login${next}`}>Đăng nhập</Link>
        </Button>
        <Button asChild size="lg" className="hidden sm:inline-flex">
          <Link href="/register">Đăng ký</Link>
        </Button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-2" aria-label={`Tài khoản: ${user.name}`}>
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
            {initials(user.name)}
          </span>
          <span className="hidden max-w-36 truncate text-sm font-medium sm:inline">{user.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-0.5">
          <div className="truncate font-semibold">{user.name}</div>
          <div className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
            {user.isVerifier ? <ShieldCheck className="size-3.5" aria-hidden="true" /> : <UserRound className="size-3.5" aria-hidden="true" />}
            {user.isVerifier ? 'Người xác minh' : 'Thành viên'}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => saveSession(null)}>
          <LogOut />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
