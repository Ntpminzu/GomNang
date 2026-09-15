'use client'

import { useEffect, useState } from 'react'
import { UserRound } from 'lucide-react'
import { DEMO_IDS, DEMO_USERS } from '@gomnang/shared/demo-data.ts'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
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
    <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:max-w-[17rem]">
      <div className="flex min-w-0 items-center gap-2">
        <label htmlFor="as-user" className="sr-only">
          Đang dùng với tài khoản
        </label>
        <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <NativeSelect
          id="as-user"
          size="sm"
          className="min-w-0 flex-1"
          value={current}
          disabled={busy}
          onChange={(e) => choose(e.target.value)}
        >
          {current === '' && <NativeSelectOption value="">…</NativeSelectOption>}
          <NativeSelectOption value="guest">Khách (chưa đăng nhập)</NativeSelectOption>
          {DEMO_ACCOUNTS.map((account) => (
            <NativeSelectOption key={account.id} value={account.id}>
              {account.name} — {account.hint}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {busy && (
        <span className="text-xs text-muted-foreground" role="status">
          Đang đăng nhập…
        </span>
      )}
      {error && (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
