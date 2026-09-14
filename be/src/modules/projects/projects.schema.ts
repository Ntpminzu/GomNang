import { z } from 'zod'
import { NEED_KINDS } from '@gomnang/domain/types.ts'
const MAX_QUANTITY = 10_000_000
const str = (max: number) => z.string().trim().max(max)

export const projectBody = z.object({
  name: str(150),
  goal: str(2000),
  beneficiaryGroup: str(200),
  location: str(300),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  treasurerId: z
    .uuid()
    .nullish()
    .transform((v) => v ?? null),
  needItems: z
    .array(z.object({ label: str(100), unit: str(30), kind: z.enum(NEED_KINDS), targetQty: z.number().max(MAX_QUANTITY) }))
    .max(30),
})
