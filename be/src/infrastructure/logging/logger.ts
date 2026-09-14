export type Level = 'info' | 'warn' | 'error'

export function log(level: Level, msg: string, fields: Record<string, unknown> = {}) {
  if (process.env.LOG_SILENT === '1') return
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...fields })
  if (level === 'error') console.error(line)
  else console.log(line)
}
