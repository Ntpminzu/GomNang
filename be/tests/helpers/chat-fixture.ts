import type { ChatEmbedder } from '../../src/modules/chat/chat.embedding.ts'
function vector(text: string, query: boolean) {
  const n = text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd')
  const bucket = n.includes('mua sen tim') ? 0 : n.includes('tao du an') ? 1 : /tim (theo ten|du an)|du an o dau|trang du an tai/.test(n) ? 2 : query ? 1023 : 1022
  const values = Array<number>(1024).fill(0); values[bucket] = 1
  return values
}
/** Synthetic orthogonal vectors test DB/contract wiring, not semantic model quality. */
export const fixtureEmbedder: ChatEmbedder = {
  model: 'test-fixture-v1', dimensions: 1024,
  async embedDocuments(texts) { return texts.map((text) => vector(text, false)) },
  async embedQuery(question) { return vector(question, true) },
}
