'use client'

import { useEffect, useState } from 'react'
import { resetMockData } from '@/lib/api.ts'
import { DEMO_ACCOUNTS, getSessionUser, setSessionUser } from '@/lib/session.ts'

/**
 * Chọn tài khoản mẫu để đóng vai — thay cho đăng nhập ở Homework 3B.
 * Đổi tài khoản thì tải lại cả trang, để mọi màn hình đọc lại quyền từ đầu.
 */
export function UserSwitcher() {
  const [current, setCurrent] = useState('')

  useEffect(() => {
    setCurrent(getSessionUser()?.id ?? 'guest')
  }, [])

  return (
    <div className="user-switcher">
      <label htmlFor="as-user" className="sr-only">
        Đang dùng với tài khoản
      </label>
      <select
        id="as-user"
        value={current}
        onChange={(e) => {
          setSessionUser(e.target.value === 'guest' ? null : e.target.value)
          window.location.reload()
        }}
      >
        {current === '' && <option value="">…</option>}
        <option value="guest">Khách (chưa đăng nhập)</option>
        {DEMO_ACCOUNTS.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name} — {account.hint}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => {
          if (window.confirm('Xoá mọi thay đổi đã làm và nạp lại dữ liệu mẫu?')) {
            resetMockData()
            window.location.reload()
          }
        }}
      >
        Đặt lại dữ liệu
      </button>
    </div>
  )
}
