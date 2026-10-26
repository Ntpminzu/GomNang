import { HttpError } from '../../common/errors/http-error.ts'
import { QUERY_INSTRUCTION } from './chat.config.ts'
import { providerFailure, providerSignal, readProviderJson, type ChatCallOptions } from './chat.transport.ts'
import { withAbort } from './chat.runtime.ts'

export const CHAT_EMBEDDING_DIMENSIONS = 1024

export type ChatEmbedder = {
  model: string
  dimensions: number
  embedDocuments(texts: string[], options?: ChatCallOptions): Promise<number[][]>
  embedQuery(question: string, options?: ChatCallOptions): Promise<number[]>
}

export function queryEmbeddingInput(question: string) {
  return `Instruct: ${QUERY_INSTRUCTION}\nQuery: ${question.trim()}`
}

export function createOllamaEmbedder(
  baseUrl: string,
  model: string,
  fetchImpl: typeof fetch = fetch,
): ChatEmbedder {
  async function embed(inputs: string[], options?: ChatCallOptions): Promise<number[][]> {
    if (inputs.length === 0) return []
    const signal = providerSignal(options?.signal)
    const timeout = new HttpError(504, 'EMBEDDING_TIMEOUT', 'Model embedding phản hồi quá lâu. Vui lòng thử lại.')
    const unavailable = new HttpError(503, 'EMBEDDING_UNAVAILABLE', 'Không kết nối được model embedding trong Ollama.')
    let response: Response
    try {
      response = await withAbort(signal, () => fetchImpl(`${baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, input: inputs, truncate: true }),
        signal,
      }))
    } catch (error) {
      throw providerFailure(error, signal, timeout, unavailable)
    }
    if (!response.ok) {
      throw new HttpError(502, 'EMBEDDING_ERROR', 'Ollama không tạo được embedding. Hãy kiểm tra model đã tải.')
    }
    let data: unknown
    try { data = await readProviderJson(response, signal, 4_194_304) } catch (error) {
      if (error instanceof HttpError && error.code === 'CHAT_PROVIDER_JSON_INVALID') throw new HttpError(502, 'EMBEDDING_ERROR', 'Ollama trả về embedding không hợp lệ.')
      throw providerFailure(error, signal, timeout, unavailable)
    }
    const embeddings = (data as { embeddings?: unknown } | null)?.embeddings
    if (!Array.isArray(embeddings) || embeddings.length !== inputs.length) {
      throw new HttpError(502, 'EMBEDDING_ERROR', 'Ollama trả về sai số lượng embedding.')
    }
    return embeddings.map((value) => {
      if (!Array.isArray(value) || value.length !== CHAT_EMBEDDING_DIMENSIONS
        || value.some((item) => typeof item !== 'number' || !Number.isFinite(item))) {
        throw new HttpError(
          502,
          'EMBEDDING_DIMENSIONS_MISMATCH',
          `Model embedding phải trả về vector ${CHAT_EMBEDDING_DIMENSIONS} chiều.`,
        )
      }
      return value as number[]
    })
  }

  return {
    model,
    dimensions: CHAT_EMBEDDING_DIMENSIONS,
    embedDocuments: embed,
    async embedQuery(question, options) {
      const [embedding] = await embed([queryEmbeddingInput(question)], options)
      return embedding
    },
  }
}
