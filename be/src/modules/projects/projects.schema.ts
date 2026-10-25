import { z } from 'zod'
import { PAGE_SIZE, PROJECT_SORTS } from '@gomnang/domain/catalog.ts'
import { NEED_KINDS, PROJECT_STATUSES } from '@gomnang/domain/types.ts'
const MAX_QUANTITY = 10_000_000
const str = (max: number) => z.string().trim().max(max)

// Chỉ kiểm định dạng (400). Độ dài tối thiểu của báo cáo / lý do là quy tắc nghiệp vụ trong packages/domain (422).
export const completeBody = z.object({ report: z.string().max(5000) })
export const cancelBody = z.object({ reason: z.string().max(1000) })

/** Query của danh sách công khai. Trạng thái không công khai không lỗi nhưng không trả dòng nào (lọc ở domain). */
export const listQuery = z.object({
  q: str(100).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  kind: z.enum(NEED_KINDS).optional(),
  sort: z.enum(PROJECT_SORTS).default('soon'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(PAGE_SIZE.max).default(PAGE_SIZE.default),
})

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
    .array(
      z.object({
        label: str(100),
        unit: str(30),
        kind: z.enum(NEED_KINDS),
        targetQty: z.number().max(MAX_QUANTITY),
        shift: z
          .object({ date: z.string().max(10), start: z.string().max(5), end: z.string().max(5), place: str(200) })
          .nullish()
          .transform((v) => v ?? null),
      }),
    )
    .max(30),
})
