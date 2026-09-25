'use client'
import { useState } from 'react'
import { DEMO_USERS } from '@gomnang/domain/demo-data.ts'
import { resetMockData } from '../../../../libs/api/index.ts'
import { loginByEmail } from '../../../../libs/api/http/auth.ts'
import { toApiError } from '../../../../libs/api/errors.ts'
import { isMockMode } from '../../../../libs/config/env.ts'
import { DEMO_ACCOUNTS, saveSession, selectMockUser } from '../../../../libs/session/index.ts'
import { useSession } from '../../../providers/SessionProvider.tsx'

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
    <div className="user-switcher">
      <label htmlFor="as-user" className="sr-only">Đang dùng với tài khoản</label>
      <select id="as-user" value={user?.id ?? 'guest'} disabled={!ready || busy} onChange={(e) => void switchUser(e.target.value)}>
        <option value="guest">Khách (chưa đăng nhập)</option>
        {DEMO_ACCOUNTS.map((account) => <option key={account.id} value={account.id}>{account.name} — {account.hint}</option>)}
      </select>
      {busy && <span role="status">Đang đăng nhập…</span>}
      {error && <span role="alert">{error}</span>}
      {isMockMode && <button type="button" className="btn btn-sm" onClick={async () => {
        if (window.confirm('Xoá mọi thay đổi đã làm và nạp lại dữ liệu mẫu?')) {
          await resetMockData()
          window.location.reload()
        }
      }}>Đặt lại dữ liệu</button>}
    </div>
  )
}
