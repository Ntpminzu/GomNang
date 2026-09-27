'use client'
import { useEffect, useState } from 'react'
import { readNext, safeNext } from '../../libs/utils/redirect.ts'

/** "?next=…" để giữ trang đích khi chuyển qua lại giữa đăng nhập và đăng ký. Đọc sau khi mount để HTML máy chủ và trình duyệt khớp nhau. */
export function useNextQuery() {
  const [query, setQuery] = useState('')
  useEffect(() => {
    const next = readNext()
    if (next) setQuery(`?next=${encodeURIComponent(safeNext(next))}`)
  }, [])
  return query
}
