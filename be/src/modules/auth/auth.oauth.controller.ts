import type { Request, Response, Router } from 'express'
import { z } from 'zod'
import { safeReturnPath } from '@gomnang/domain/auth.ts'
import { HttpError } from '../../common/errors/http-error.ts'
import { inputOf, validateBody } from '../../common/middleware/validation.ts'
import { completeGoogle, confirmGoogle } from './auth.oauth.service.ts'
import type { AuthDeps } from './auth.types.ts'
const COOKIE = 'gomnang.oauth'
const PATH = '/api/auth/google'
function cookieId(req: Request) {
  const value = req.get('cookie')?.split(';').map((s) => s.trim()).find((s) => s.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1)
  return value && /^[a-f0-9]{64}$/.test(value) ? value : undefined
}
function google(deps: AuthDeps) {
  if (!deps.google) throw new HttpError(404, 'GOOGLE_DISABLED', 'Đăng nhập Google chưa được cấu hình.')
  return deps.google
}
function clear(res: Response, deps: AuthDeps) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', path: PATH, secure: !!deps.google?.origin.startsWith('https:') })
}
function sameOrigin(req: Request, deps: AuthDeps) {
  if (req.get('origin') !== google(deps).origin) throw new HttpError(403, 'ORIGIN_REJECTED', 'Nguồn yêu cầu không hợp lệ.')
}
export function mountGoogleRoutes(router: Router, deps: AuthDeps) {
  router.get(PATH + '/start', (req, res) => {
    const runtime = google(deps)
    const old = cookieId(req); deps.oauthState.discard(old)
    const flow = deps.oauthState.start(safeReturnPath(typeof req.query.next === 'string' ? req.query.next : null))
    res.cookie(COOKIE, flow.id, { httpOnly: true, sameSite: 'lax', path: PATH, secure: runtime.origin.startsWith('https:'), maxAge: 5 * 60_000 })
    res.redirect(302, runtime.client.authorizationUrl(flow))
  })
  router.get(PATH + '/callback', async (req, res) => {
    const runtime = google(deps), id = cookieId(req)
    try {
      const flow = deps.oauthState.callback(id, typeof req.query.state === 'string' ? req.query.state : '')
      if (req.query.error) {
        deps.oauthState.discard(id); clear(res, deps)
        const status = req.query.error === 'access_denied' ? 'cancelled' : 'failed'
        res.redirect(302, runtime.origin + '/auth/callback?status=' + status); return
      }
      if (typeof req.query.code !== 'string' || !req.query.code) throw new Error('missing code')
      flow.profile = await runtime.client.exchange(req.query.code, flow.verifier, flow.nonce)
      deps.oauthState.get(id) // Do not revive a flow that expired while the provider was responding.
      flow.phase = 'ready'
      res.redirect(302, runtime.origin + '/auth/callback?status=ready')
    } catch {
      deps.oauthState.discard(id); clear(res, deps)
      res.redirect(302, runtime.origin + '/auth/callback?status=failed')
    }
  })
  router.post(PATH + '/complete', async (req, res) => {
    sameOrigin(req, deps)
    const id = cookieId(req), flow = deps.oauthState.claim(id, 'ready', 'consuming')
    try {
      if (!flow.profile) throw new HttpError(410, 'OAUTH_FLOW_EXPIRED', 'Bắt đầu đăng nhập Google lại.')
      const result = await completeGoogle(flow.profile, deps)
      if (result.status === 'link_required') {
        flow.candidate = result.candidate; flow.phase = 'linking'
        res.json({ status: 'link_required' }); return
      }
      deps.oauthState.discard(id); clear(res, deps)
      res.json({ status: result.status, token: result.token, user: result.user, next: flow.next })
    } catch (err) { deps.oauthState.discard(id); clear(res, deps); throw err }
  })
  router.post(PATH + '/link-confirm', (req, _res, next) => { sameOrigin(req, deps); next() },
    validateBody(z.strictObject({ password: z.string().min(1), confirm: z.literal(true) })),
    async (req, res) => {
      const id = cookieId(req), flow = deps.oauthState.claim(id, 'linking', 'consuming')
      flow.attempts++
      try {
        if (!flow.profile || !flow.candidate) throw new HttpError(410, 'OAUTH_FLOW_EXPIRED', 'Bắt đầu đăng nhập Google lại.')
        const { password } = inputOf<{ password: string }>(res)
        const result = await confirmGoogle(flow.profile, flow.candidate, password, deps)
        deps.oauthState.discard(id); clear(res, deps)
        res.json({ ...result, next: flow.next })
      } catch (err) {
        if (err instanceof HttpError && err.code === 'LINK_PASSWORD_INVALID' && flow.attempts < 5) flow.phase = 'linking'
        else { deps.oauthState.discard(id); clear(res, deps) }
        throw err
      }
    })
}
