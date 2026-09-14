import { useState } from 'react'
import { toApiError, type ApiError } from './api-client.ts'

/** Chạy một thao tác ghi: khoá nút trong lúc gửi, giữ lỗi để hiện ra, xong thì báo cho trang tải lại. */
export function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  async function run(action: () => Promise<unknown>, onDone: () => void) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onDone()
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, run }
}
