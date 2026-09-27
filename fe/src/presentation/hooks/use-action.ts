'use client'
import { useState } from 'react'
import { toApiError, type ApiError } from '../../libs/api/errors.ts'
export function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  /** onDone có thể trả Promise (thường là reload()): nút giữ trạng thái bận tới khi dữ liệu mới về. */
  async function run(action: () => Promise<unknown>, onDone: () => unknown) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await onDone()
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, run, clear: () => setError(null) }
}
