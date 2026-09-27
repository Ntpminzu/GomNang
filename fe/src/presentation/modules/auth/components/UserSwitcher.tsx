'use client'
import { useState } from 'react'
import { RotateCcw, UserRound } from 'lucide-react'
import { DEMO_USERS } from '@gomnang/domain/demo-data.ts'
import { resetMockData } from '../../../../libs/api/index.ts'
import { loginByEmail } from '../../../../libs/api/http/auth.ts'
import { toApiError } from '../../../../libs/api/errors.ts'
import { isMockMode } from '../../../../libs/config/env.ts'
import { DEMO_ACCOUNTS, saveSession, selectMockUser } from '../../../../libs/session/index.ts'
import { Button } from '../../../components/ui/button.tsx'
import { NativeSelect, NativeSelectOption } from '../../../components/ui/native-select.tsx'
import { useSession } from '../../../providers/SessionProvider.tsx'

/** Chỉ dùng ở chế độ mock: đổi nhanh giữa các tài khoản mẫu để thử từng vai. */
export function UserSwitcher() {
  const { user, ready } = useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function switchUser(id: string) {
    setBusy(true)
    setError('')
    try {
      if (isMockMode) selectMockUser(id === 'guest' ? null : id)
      else {
        saveSession(null)
        if (id !== 'guest') {
          const account = DEMO_USERS.find((u) => u.id === id)
          if (!account) throw new Error('Không tìm thấy tài khoản mẫu.')
          const session = await loginByEmail(account.email)
          saveSession(session.user, session.token)
        }
      }
    } catch (err) { setError(toApiError(err).message) }
    finally { setBusy(false) }
  }
  return (
    <div className="flex min-w-0 items-center gap-2">
      <label htmlFor="as-user" className="sr-only">Đang dùng với tài khoản</label>
      <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <NativeSelect id="as-user" size="sm" className="max-w-56" value={user?.id ?? 'guest'} disabled={!ready || busy} onChange={(e) => void switchUser(e.target.value)}>
        <NativeSelectOption value="guest">Khách (chưa đăng nhập)</NativeSelectOption>
        {DEMO_ACCOUNTS.map((account) => <NativeSelectOption key={account.id} value={account.id}>{account.name} — {account.hint}</NativeSelectOption>)}
      </NativeSelect>
      {busy && <span className="text-xs text-muted-foreground" role="status">Đang đăng nhập…</span>}
      {error && <span className="text-xs text-destructive" role="alert">{error}</span>}
      {isMockMode && <Button variant="ghost" size="icon" aria-label="Đặt lại dữ liệu mẫu" onClick={async () => {
        if (window.confirm('Xoá mọi thay đổi đã làm và nạp lại dữ liệu mẫu?')) {
          await resetMockData()
          window.location.reload()
        }
      }}><RotateCcw /></Button>}
    </div>
  )
}
