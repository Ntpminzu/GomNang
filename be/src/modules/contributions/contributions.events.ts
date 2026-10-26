import type { RequestHandler } from 'express'
import { HttpError } from '../../common/errors/http-error.ts'
import { idOf } from '../../common/middleware/validation.ts'
import type { ContributionsDeps } from './contributions.types.ts'

// shortcut: events live in one process; use a shared broker before running multiple BE instances.
export function createContributionEvents() {
  const listeners = new Map<string, Set<() => void>>()
  return {
    subscribe(projectId: string, listener: () => void) {
      const group = listeners.get(projectId) ?? new Set<() => void>()
      group.add(listener)
      listeners.set(projectId, group)
      return () => { group.delete(listener); if (!group.size) listeners.delete(projectId) }
    },
    publish(projectId: string) {
      for (const listener of listeners.get(projectId) ?? []) {
        try { listener() } catch { /* A disconnected reader must not fail a committed write. */ }
      }
    },
  }
}
export type ContributionEvents = ReturnType<typeof createContributionEvents>

export function contributionEvents(deps: ContributionsDeps, authorizeView: (header: string | undefined, projectId: string) => Promise<void>): RequestHandler {
  return async (req, res) => {
    const projectId = idOf(res)
    const authorize = () => authorizeView(req.get('authorization'), projectId)
    await authorize()
    if (res.destroyed) return
    let closed = false
    let checking = false
    let pending = false
    let heartbeat: ReturnType<typeof setInterval> | undefined
    let rotation: ReturnType<typeof setTimeout> | undefined
    let unsubscribe: (() => void) | undefined
    const close = () => {
      if (closed) return
      closed = true
      clearInterval(heartbeat)
      clearTimeout(rotation)
      unsubscribe?.()
      res.end()
    }
    const send = (event: string) => {
      if (closed) return
      try {
        if (!res.write(`event: ${event}\ndata: ${JSON.stringify({ projectId })}\n\n`)) close()
      } catch { close() }
    }
    const check = async (changed: boolean) => {
      pending ||= changed
      if (checking || closed) return
      checking = true
      try {
        do {
          const notify = pending
          pending = false
          await authorize()
          send(notify ? 'contributions-changed' : 'heartbeat')
        } while (pending && !closed)
      } catch (error) {
        if (error instanceof HttpError && error.status === 401) send('auth-required')
        else if (error instanceof HttpError && error.status === 404) send('access-lost')
        close()
      } finally { checking = false }
    }
    res.on('close', close)
    res.on('error', close)
    res.status(200).set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    })
    res.flushHeaders()
    unsubscribe = deps.events?.subscribe(projectId, () => { void check(true) })
    heartbeat = setInterval(() => { void check(false) }, 15_000)
    rotation = setTimeout(() => { send('reconnect'); close() }, 60_000)
    send('ready')
  }
}
