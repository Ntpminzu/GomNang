import { z } from 'zod'
import { NEED_KINDS } from '@gomnang/domain/types.ts'
const MAX_QUANTITY = 10_000_000
const str = (max: number) => z.string().trim().max(max)

// Chỉ kiểm định dạng (400). Độ dài tối thiểu của báo cáo / lý do là quy tắc nghiệp vụ trong packages/domain (422).
export const completeBody = z.object({ report: z.string().max(5000) })
export const cancelBody = z.object({ reason: z.string().max(1000) })

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
