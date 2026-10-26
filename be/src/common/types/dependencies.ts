import type { Db } from '../../infrastructure/database/client.ts'
import type { ChatModels } from '../../modules/chat/chat.model.ts'
import type { ChatEmbedder } from '../../modules/chat/chat.embedding.ts'
import type { GoogleRuntime } from '../../modules/auth/auth.oauth.ts'
export type AppDeps = {
  db: Db
  chatDb?: Db
  secret: Uint8Array
  devLoginEnabled: boolean
  today: () => string
  chatModels: ChatModels
  chatEmbedder: ChatEmbedder
  google?: GoogleRuntime
}
