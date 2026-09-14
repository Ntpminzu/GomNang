import { z } from 'zod'
export const loginBody = z.object({ email: z.email() })
