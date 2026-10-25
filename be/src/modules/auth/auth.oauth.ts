import { createHash } from 'node:crypto'
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose'
import { z } from 'zod'
import { HttpError } from '../../common/errors/http-error.ts'
export type GoogleProfile = { subject: string; email: string; name: string }
export type GoogleClient = {
  authorizationUrl(input: { state: string; nonce: string; verifier: string }): string
  exchange(code: string, verifier: string, nonce: string): Promise<GoogleProfile>
}
export type GoogleRuntime = { origin: string; client: GoogleClient }
export type GoogleSettings = { clientId: string; clientSecret: string; origin: string }
const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))
export async function verifyGoogleIdToken(token: string, clientId: string, nonce: string, key: JWTVerifyGetKey = keys): Promise<GoogleProfile> {
  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: clientId, algorithms: ['RS256'],
      requiredClaims: ['exp', 'iat', 'sub', 'nonce'],
    })
    if (payload.nonce !== nonce || payload.email_verified !== true || typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 255 || !z.email().safeParse(payload.email).success) throw new Error('invalid identity')
    const email = (payload.email as string).trim().toLowerCase()
    const name = typeof payload.name === 'string' && payload.name.trim().length >= 2 ? payload.name.trim().slice(0, 100) : 'Thành viên'
    return { subject: payload.sub, email, name }
  } catch { throw new HttpError(502, 'GOOGLE_IDENTITY_INVALID', 'Không xác minh được danh tính Google. Bắt đầu đăng nhập lại.') }
}
export function createGoogleClient(settings: GoogleSettings): GoogleClient {
  const redirectUri = settings.origin + '/api/auth/google/callback'
  return {
    authorizationUrl({ state, nonce, verifier }) {
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      url.search = new URLSearchParams({
        client_id: settings.clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'openid email profile',
        state, nonce, code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url'), prompt: 'select_account',
      }).toString()
      return url.toString()
    },
    async exchange(code, verifier, nonce) {
      let token: string
      try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST', signal: AbortSignal.timeout(10_000),
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: settings.clientId, client_secret: settings.clientSecret, code_verifier: verifier }),
        })
        const data = await response.json() as { id_token?: unknown }
        if (!response.ok || typeof data.id_token !== 'string') throw new Error('provider rejected')
        token = data.id_token
      } catch { throw new HttpError(502, 'GOOGLE_UNAVAILABLE', 'Không kết nối được Google. Thử đăng nhập lại.') }
      return verifyGoogleIdToken(token, settings.clientId, nonce)
    },
  }
}
