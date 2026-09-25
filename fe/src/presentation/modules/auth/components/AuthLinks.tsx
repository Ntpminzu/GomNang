'use client'
import Link from 'next/link'
import { useSession } from '../../../providers/SessionProvider.tsx'
import { saveSession } from '../../../../libs/session/index.ts'

export function AuthLinks() {
  const { user, ready } = useSession()
  if (!ready) return null

  if (user) {
    return (
      <div className="user-switcher">
        <span style={{ fontSize: '.85rem' }}>{user.name}</span>
        <button type="button" className="btn btn-sm" onClick={() => saveSession(null)}>
          Đăng xuất
        </button>
      </div>
    )
  }

  return (
    <div className="user-switcher">
      <Link href="/login" className="btn btn-sm">Đăng nhập</Link>
      <Link href="/register" className="btn btn-sm btn-primary">Đăng ký</Link>
    </div>
  )
}
