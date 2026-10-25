/** Only return to paths on this application, including after provider callbacks. */
export function safeReturnPath(raw: string | null | undefined): string {
  const base = 'http://gomnang.invalid'
  if (!raw?.startsWith('/') || raw.startsWith('//')) return '/'
  try {
    const url = new URL(raw, base)
    const path = url.pathname + url.search + url.hash
    return url.origin === base && !path.startsWith('//') ? path : '/'
  } catch { return '/' }
}
