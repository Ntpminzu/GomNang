export { safeReturnPath as safeNext } from '@gomnang/domain/auth.ts'
export const readNext = (): string | null => new URLSearchParams(globalThis.location?.search).get('next')
export const roleHome = (role: string) => role === 'admin' ? '/admin/verifiers' : role === 'verifier' ? '/verify' : '/'
