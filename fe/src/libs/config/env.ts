const mode = process.env.NEXT_PUBLIC_API_MODE ?? 'http'
if (mode !== 'mock' && mode !== 'http') throw new Error('NEXT_PUBLIC_API_MODE phải là mock hoặc http.')
export const apiMode: 'mock' | 'http' = mode
export const isMockMode = apiMode === 'mock'
