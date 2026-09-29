import { HttpError } from '../../common/errors/http-error.ts'

export const CHAT_EMBEDDING_DIMENSIONS = 1024

const QUERY_INSTRUCTION = 'Given a Vietnamese question about GOM NẮNG, retrieve relevant public project or website guidance passages that answer the question.'

export type ChatEmbedder = {
  model: string
  dimensions: number
  embedDocuments(texts: string[]): Promise<number[][]>
  embedQuery(question: string): Promise<number[]>
}

function queryInput(question: string) {
  return `Instruct: ${QUERY_INSTRUCTION}\nQuery: ${question.trim()}`
}

export function createOllamaEmbedder(
  baseUrl: string,
  model: string,
  fetchImpl: typeof fetch = fetch,
): ChatEmbedder {
  async function embed(inputs: string[]): Promise<number[][]> {
    if (inputs.length === 0) return []
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, input: inputs, truncate: true }),
        signal: AbortSignal.timeout(120_000),
      })
    } catch (error) {
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new HttpError(504, 'EMBEDDING_TIMEOUT', 'Model embedding phản hồi quá lâu. Vui lòng thử lại.')
      }
      throw new HttpError(503, 'EMBEDDING_UNAVAILABLE', 'Không kết nối được model embedding trong Ollama.')
    }
    if (!response.ok) {
      throw new HttpError(502, 'EMBEDDING_ERROR', 'Ollama không tạo được embedding. Hãy kiểm tra model đã tải.')
    }
    let data: unknown
    try { data = await response.json() } catch {
      throw new HttpError(502, 'EMBEDDING_ERROR', 'Ollama trả về embedding không hợp lệ.')
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
    async embedQuery(question) {
      const [embedding] = await embed([queryInput(question)])
      return embedding
    },
  }
}
