import type { Db } from '../../infrastructure/database/client.ts'
import type { ChatModels } from '../../modules/chat/chat.model.ts'
import type { ChatEmbedder } from '../../modules/chat/chat.embedding.ts'
export type AppDeps = {
  db: Db
  secret: Uint8Array
  devLoginEnabled: boolean
  today: () => string
  chatModels: ChatModels
  chatEmbedder: ChatEmbedder
}
