import type { Db } from '../../infrastructure/database/client.ts'
export type AppDeps = {
  db: Db
  secret: Uint8Array
  devLoginEnabled: boolean
  today: () => string
}
