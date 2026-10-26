import type { ChatProvider } from '@gomnang/domain/types.ts'
import type { TokenUsage } from './chat.model.ts'

/**
 * Giá API tính bằng USD cho 1 triệu token, theo bảng giá Gemini ngày 26/10/2026
 * (https://ai.google.dev/gemini-api/docs/pricing): gemini-3.8-flash $0.75 vào, $3.75 ra tới 31/12/2026.
 * Ollama chạy trên máy nên không có hoá đơn API (chưa tính điện và phần cứng).
 * ponytail: một bảng giá cố định; đổi model hoặc tới 01/01/2027 (giá Gemini gấp đôi) thì sửa ở đây.
 */
const PRICE_PER_MILLION: Record<ChatProvider, { input: number; output: number }> = {
  ollama: { input: 0, output: 0 },
  gemini: { input: 0.75, output: 3.75 },
}

export const aiCostUsd = (provider: ChatProvider, usage: TokenUsage) =>
  (usage.inputTokens * PRICE_PER_MILLION[provider].input + usage.outputTokens * PRICE_PER_MILLION[provider].output) / 1_000_000
