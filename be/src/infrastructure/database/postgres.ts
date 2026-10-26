import pg from 'pg'
import type { PoolConfig } from 'pg'
import { readFileSync } from 'node:fs'

/** Supabase uses TLS with certificate verification. Never log the connection URL. */
export function createPool(databaseUrl: string, options: Pick<PoolConfig, 'max' | 'connectionTimeoutMillis' | 'query_timeout' | 'application_name' | 'onConnect'> = {}) {
  const url = new URL(databaseUrl)
  const supabase = url.hostname.endsWith('.supabase.com') || url.hostname.endsWith('.supabase.co')
  if (supabase) {
    for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key)
  }
  return new pg.Pool({
    connectionString: url.toString(),
    ...(supabase ? { ssl: {
      rejectUnauthorized: true,
      ca: readFileSync(new URL('../../../certs/prod-ca-2021.crt', import.meta.url), 'utf8'),
    } } : {}),
    max: 5,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 10000,
    ...options,
  })
}
