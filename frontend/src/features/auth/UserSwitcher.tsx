'use client'

import { useEffect, useState } from 'react'
import { DEMO_IDS, DEMO_USERS } from '@gomnang/shared/demo-data.ts'
import { toApiError } from '@/lib/api-client.ts'
import { clearSession, getSessionUser, saveSession } from '@/lib/session.ts'
import { devLogin } from './auth.api.ts'

/** Vai trò của từng tài khoản trong dữ liệu mẫu, để người thử biết nên chọn ai. */
const ACCOUNT_HINTS: Record<string, string> = {
  [DEMO_IDS.users.khanh]: 'điều phối dự án Hoa Mai',
  [DEMO_IDS.users.an]: 'điều phối dự án sách giáo khoa',
  [DEMO_IDS.users.mai]: 'phụ trách tài chính dự án Hoa Mai',
  [DEMO_IDS.users.hung]: 'chưa xác minh danh tính',
  [DEMO_IDS.users.tam]: 'người xác minh',
}

const DEMO_ACCOUNTS = DEMO_USERS.map((u) => ({
  id: u.id,
  email: u.email,
  name: u.displayName,
  hint: ACCOUNT_HINTS[u.id] ?? '',
}))

/**
 * Đăng nhập bằng tài khoản mẫu: gọi POST /api/auth/dev-login, lưu token nhận được.
 * Đổi tài khoản thì tải lại cả trang, để mọi màn hình đọc lại quyền từ đầu.
 */
export function UserSwitcher() {
  const [current, setCurrent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCurrent(getSessionUser()?.id ?? 'guest')
  }, [])

  async function choose(id: string) {
    setError(null)
    if (id === 'guest') {
      clearSession()
      window.location.reload()
      return
    }

    const account = DEMO_ACCOUNTS.find((a) => a.id === id)
    if (!account) return
    setBusy(true)
    try {
      const { token, user } = await devLogin(account.email)
      saveSession(token, { id: user.id, name: user.name, isVerifier: user.isVerifier })
      window.location.reload()
    } catch (err) {
      setError(toApiError(err).message)
      setBusy(false)
    }
  }

  return (
    <div className="user-switcher">
      <label htmlFor="as-user" className="sr-only">
        Đang dùng với tài khoản
      </label>
      <select id="as-user" value={current} disabled={busy} onChange={(e) => choose(e.target.value)}>
        {current === '' && <option value="">…</option>}
        <option value="guest">Khách (chưa đăng nhập)</option>
        {DEMO_ACCOUNTS.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name} — {account.hint}
          </option>
        ))}
      </select>
      {busy && (
        <span className="muted" role="status">
          Đang đăng nhập…
        </span>
      )}
      {error && (
        <span className="error-text" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
