import { randomBytes, timingSafeEqual } from 'node:crypto'
import { HttpError } from '../../common/errors/http-error.ts'
import type { GoogleProfile } from './auth.oauth.ts'

export type LinkCandidate = { id: string; email: string; passwordHash: string }
type Phase = 'started' | 'exchanging' | 'ready' | 'linking' | 'consuming'
export type OAuthFlow = {
  id: string; state: string; nonce: string; verifier: string; next: string; expiresAt: number
  phase: Phase; attempts: number; profile?: GoogleProfile; candidate?: LinkCandidate
}
const random = () => randomBytes(32).toString('hex')
const expired = () => new HttpError(410, 'OAUTH_FLOW_EXPIRED', 'Lượt đăng nhập đã hết hạn hoặc được sử dụng. Bắt đầu đăng nhập Google lại.')
/** shortcut: transient flows live in one backend process; use a shared store before scaling replicas. */
export class OAuthStateStore {
  private flows = new Map<string, OAuthFlow>()
  private clock: () => number
  constructor(clock: () => number = Date.now) { this.clock = clock }
  start(next: string) {
    for (const [id, flow] of this.flows) if (flow.expiresAt <= this.clock()) this.flows.delete(id)
    if (this.flows.size >= 256) throw new HttpError(429, 'OAUTH_BUSY', 'Có quá nhiều lượt đăng nhập. Thử lại sau.')
    const flow: OAuthFlow = { id: random(), state: random(), nonce: random(), verifier: random(), next, expiresAt: this.clock() + 5 * 60_000, phase: 'started', attempts: 0 }
    this.flows.set(flow.id, flow)
    return flow
  }
  get(id: string | undefined) {
    const flow = id ? this.flows.get(id) : undefined
    if (!flow || flow.expiresAt <= this.clock()) { if (id) this.flows.delete(id); throw expired() }
    return flow
  }
  claim(id: string | undefined, from: Phase, to: Phase) {
    const flow = this.get(id)
    if (flow.phase !== from) throw expired()
    flow.phase = to // Claim synchronously before the first asynchronous provider/DB call.
    return flow
  }
  callback(id: string | undefined, state: string) {
    const flow = this.get(id)
    if (state.length !== flow.state.length || !timingSafeEqual(Buffer.from(state), Buffer.from(flow.state))) throw expired()
    return this.claim(id, 'started', 'exchanging')
  }
  discard(id: string | undefined) { if (id) this.flows.delete(id) }
}
