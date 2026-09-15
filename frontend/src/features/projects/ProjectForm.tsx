'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Plus, Trash2 } from 'lucide-react'
import { NEED_KIND_LABEL, type Member, type NeedKind, type ProjectDetail, type ProjectInput } from '@gomnang/shared/types.ts'
import { todayInVietnam, validateProject, type FieldErrors } from '@gomnang/shared/validate-project.ts'
import { toApiError, type ApiError } from '@/lib/api-client.ts'
import { getSessionUser, type SessionUser } from '@/lib/session.ts'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState, ErrorAlert, FormField, SectionHeading, a11yProps } from '@/components/states.tsx'
import { listMembers } from './projects.api.ts'

const BENEFICIARY_GROUPS = [
  'Người vô gia cư, người có hoàn cảnh khó khăn tại địa phương',
  'Trẻ em tại mái ấm',
  'Học sinh thiếu điều kiện học tập',
  'Cơ sở bảo trợ xã hội hoặc người cao tuổi neo đơn',
  'Cộng đồng chịu ảnh hưởng thiên tai',
  'Cộng đồng cần cải thiện môi trường sống',
]

/** Trong form, số lượng giữ dạng chuỗi đúng như người dùng gõ; chỉ đổi sang số lúc gửi. */
type NeedDraft = { label: string; unit: string; kind: NeedKind; targetQty: string }
type FormState = Omit<ProjectInput, 'treasurerId' | 'needItems'> & { treasurerId: string; needItems: NeedDraft[] }

const emptyNeed = (): NeedDraft => ({ label: '', unit: '', kind: 'goods', targetQty: '' })

function toFormState(input?: ProjectInput): FormState {
  if (!input) {
    return { name: '', goal: '', beneficiaryGroup: '', location: '', startDate: '', endDate: '', treasurerId: '', needItems: [emptyNeed()] }
  }
  return {
    ...input,
    treasurerId: input.treasurerId ?? '',
    needItems: input.needItems.map((n) => ({ ...n, targetQty: String(n.targetQty) })),
  }
}

/** Ô số để trống thành NaN, để quy tắc báo "phải là số nguyên lớn hơn 0" thay vì lặng lẽ thành 0. */
function toInput(form: FormState): ProjectInput {
  return {
    ...form,
    treasurerId: form.treasurerId || null,
    needItems: form.needItems.map((n) => ({ ...n, targetQty: n.targetQty.trim() === '' ? Number.NaN : Number(n.targetQty) })),
  }
}

export function detailToInput(project: ProjectDetail): ProjectInput {
  return {
    name: project.name,
    goal: project.goal,
    beneficiaryGroup: project.beneficiaryGroup,
    location: project.location,
    startDate: project.startDate,
    endDate: project.endDate,
    treasurerId: project.treasurer?.id ?? null,
    needItems: project.needs.map(({ label, unit, kind, targetQty }) => ({ label, unit, kind, targetQty })),
  }
}

type Props = {
  initial?: ProjectInput
  submitLabel: string
  submittingLabel: string
  /** Ném ApiError nếu thất bại. Thành công thì trang cha tự chuyển sang trang dự án. */
  onSubmit: (input: ProjectInput) => Promise<void>
}

export function ProjectForm({ initial, submitLabel, submittingLabel, onSubmit }: Props) {
  /** `undefined` = chưa đọc xong phiên; `null` = khách chưa đăng nhập. */
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined)
  const [members, setMembers] = useState<Member[] | null>(null)
  const [membersError, setMembersError] = useState<ApiError | null>(null)
  const [form, setForm] = useState<FormState>(() => toFormState(initial))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<ApiError | null>(null)

  useEffect(() => {
    const session = getSessionUser()
    setUser(session)
    if (!session) return
    listMembers().then(setMembers, (err: unknown) => {
      setMembers([])
      setMembersError(toApiError(err))
    })
  }, [])

  if (user === undefined) return null
  if (user === null) {
    return (
      <EmptyState title="Cần chọn tài khoản">
        <p>Chọn một tài khoản mẫu ở góc trên bên phải để tạo hoặc sửa dự án.</p>
      </EmptyState>
    )
  }

  const me = user
  const hasMoneyItem = form.needItems.some((n) => n.kind === 'money')

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))
  const updateNeed = (index: number, patch: Partial<NeedDraft>) =>
    setForm((f) => ({ ...f, needItems: f.needItems.map((n, i) => (i === index ? { ...n, ...patch } : n)) }))

  function showErrors(found: FieldErrors) {
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) document.getElementById(first)?.focus()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = toInput(form)
    const treasurer = members?.find((m) => m.id === input.treasurerId)

    // Ngày hôm nay lấy lúc bấm nút, không lấy lúc render — tránh lệch HTML giữa máy chủ và trình duyệt.
    // Kiểm ở đây chỉ để báo lỗi sớm; backend kiểm lại đúng hàm này trước khi ghi.
    const found = validateProject(input, {
      today: todayInVietnam(),
      coordinatorId: me.id,
      treasurerVerified: input.treasurerId && members ? treasurer?.verified === true : undefined,
    })
    setSubmitError(null)
    showErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      await onSubmit(input)
    } catch (err) {
      const apiError = toApiError(err)
      // Máy chủ kiểm lại vẫn thấy sai: hiện lỗi theo từng ô, y như lỗi bắt được ở trình duyệt.
      if (apiError.status === 422 && apiError.details) showErrors(apiError.details)
      else setSubmitError(apiError)
      setSubmitting(false)
    }
  }

  const errorList = Object.entries(errors)

  return (
    <>
      {errorList.length > 0 && (
        <Alert variant="destructive" className="mb-4 border-destructive/40 bg-destructive/5">
          <AlertCircle />
          <AlertTitle>
            <strong>Còn {errorList.length} chỗ cần sửa trước khi gửi:</strong>
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-0.5 pl-4">
              {errorList.map(([key, message]) => (
                <li key={key}>{message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {submitError && (
        <>
          <ErrorAlert error={submitError} />
          <p className="mb-4 text-sm text-muted-foreground">
            Nội dung bạn nhập vẫn còn nguyên bên dưới — bấm gửi lại khi máy chủ hoạt động trở lại.
          </p>
        </>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Card>
          <CardContent className="grid gap-5">
            <FormField id="name" label="Tên dự án" required error={errors.name} hint="Nêu rõ làm gì, cho ai, ở đâu.">
              <Input
                {...a11yProps('name', errors.name, true)}
                type="text"
                maxLength={150}
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="100 phần cơm cho mái ấm Hoa Mai"
              />
            </FormField>

            <FormField id="goal" label="Mục tiêu" required error={errors.goal} hint="Kết quả cụ thể muốn đạt được, có con số càng tốt.">
              <Textarea
                {...a11yProps('goal', errors.goal, true)}
                className="min-h-24"
                maxLength={2000}
                value={form.goal}
                onChange={(e) => update({ goal: e.target.value })}
              />
            </FormField>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField id="beneficiaryGroup" label="Nhóm thụ hưởng" required error={errors.beneficiaryGroup}>
                <NativeSelect
                  {...a11yProps('beneficiaryGroup', errors.beneficiaryGroup)}
                  className="w-full"
                  value={form.beneficiaryGroup}
                  onChange={(e) => update({ beneficiaryGroup: e.target.value })}
                >
                  <NativeSelectOption value="">— chọn nhóm —</NativeSelectOption>
                  {BENEFICIARY_GROUPS.map((g) => (
                    <NativeSelectOption key={g} value={g}>
                      {g}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>

              <FormField id="location" label="Địa điểm" required error={errors.location} hint="Ghi tới mức phường và điểm tập kết.">
                <Input
                  {...a11yProps('location', errors.location, true)}
                  type="text"
                  maxLength={300}
                  value={form.location}
                  onChange={(e) => update({ location: e.target.value })}
                  placeholder="Phường Linh Trung, TP. Thủ Đức"
                />
              </FormField>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField id="startDate" label="Ngày bắt đầu" required error={errors.startDate}>
                <Input
                  {...a11yProps('startDate', errors.startDate)}
                  type="date"
                  value={form.startDate}
                  onChange={(e) => update({ startDate: e.target.value })}
                />
              </FormField>
              <FormField id="endDate" label="Ngày kết thúc" required error={errors.endDate}>
                <Input
                  {...a11yProps('endDate', errors.endDate)}
                  type="date"
                  value={form.endDate}
                  onChange={(e) => update({ endDate: e.target.value })}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        <SectionHeading>Nhu cầu cần kêu gọi</SectionHeading>
        {errors.needItems && (
          <p className="mb-3 text-sm text-destructive" role="alert">
            {errors.needItems}
          </p>
        )}

        {form.needItems.map((need, i) => (
          <div
            className="mb-3 grid gap-4 rounded-xl border bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1.4fr_1fr_auto]"
            key={i}
          >
            <FormField id={`needItems.${i}.label`} label="Hạng mục" required error={errors[`needItems.${i}.label`]}>
              <Input
                {...a11yProps(`needItems.${i}.label`, errors[`needItems.${i}.label`])}
                className="bg-background"
                type="text"
                maxLength={100}
                value={need.label}
                onChange={(e) => updateNeed(i, { label: e.target.value })}
                placeholder="Cơm"
              />
            </FormField>
            <FormField id={`needItems.${i}.unit`} label="Đơn vị" required error={errors[`needItems.${i}.unit`]}>
              <Input
                {...a11yProps(`needItems.${i}.unit`, errors[`needItems.${i}.unit`])}
                className="bg-background"
                type="text"
                maxLength={30}
                value={need.unit}
                onChange={(e) => updateNeed(i, { unit: e.target.value })}
                placeholder="phần"
              />
            </FormField>
            <FormField id={`needItems.${i}.kind`} label="Hình thức" required>
              <NativeSelect
                {...a11yProps(`needItems.${i}.kind`)}
                className="w-full bg-background"
                value={need.kind}
                onChange={(e) => updateNeed(i, { kind: e.target.value as NeedKind })}
              >
                {Object.entries(NEED_KIND_LABEL).map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id={`needItems.${i}.targetQty`} label="Số lượng" required error={errors[`needItems.${i}.targetQty`]}>
              <Input
                {...a11yProps(`needItems.${i}.targetQty`, errors[`needItems.${i}.targetQty`])}
                className="bg-background"
                type="number"
                inputMode="numeric"
                value={need.targetQty}
                onChange={(e) => updateNeed(i, { targetQty: e.target.value })}
                placeholder="100"
              />
            </FormField>
            <div className="flex justify-end sm:col-span-2 lg:col-span-1 lg:pt-7">
              <span className="sr-only">Thao tác</span>
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setForm((f) => ({ ...f, needItems: f.needItems.filter((_, idx) => idx !== i) }))}
                aria-label={`Xoá hạng mục ${i + 1}${need.label ? `: ${need.label}` : ''}`}
              >
                <Trash2 />
                Xoá
              </Button>
            </div>
          </div>
        ))}

        <Button type="button" variant="outline" onClick={() => setForm((f) => ({ ...f, needItems: [...f.needItems, emptyNeed()] }))}>
          <Plus />
          Thêm hạng mục
        </Button>

        <SectionHeading>Người phụ trách</SectionHeading>
        <Card>
          <CardContent className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-sm leading-snug font-medium">Người điều phối</span>
                <p className="text-base font-medium">{me.name}</p>
                <p className="text-sm text-muted-foreground">Người tạo dự án luôn là người điều phối.</p>
              </div>

              <FormField
                id="treasurerId"
                label="Người phụ trách tài chính"
                required={hasMoneyItem}
                error={errors.treasurerId}
                hint={
                  hasMoneyItem
                    ? 'Dự án có hạng mục bằng tiền nên bắt buộc phải có, và phải khác người điều phối.'
                    : 'Chỉ cần khi dự án có hạng mục bằng tiền.'
                }
              >
                <NativeSelect
                  {...a11yProps('treasurerId', errors.treasurerId, true)}
                  className="w-full"
                  value={form.treasurerId}
                  onChange={(e) => update({ treasurerId: e.target.value })}
                >
                  <NativeSelectOption value="">— chưa chọn —</NativeSelectOption>
                  {(members ?? [])
                    .filter((m) => m.verified)
                    .map((m) => (
                      <NativeSelectOption key={m.id} value={m.id}>
                        {m.name}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
              </FormField>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Danh sách chỉ hiện thành viên đã được xác minh danh tính.
                {members === null && ' Đang tải danh sách thành viên…'}
              </p>
              {membersError && (
                <p className="text-sm text-destructive" role="alert">
                  Không tải được danh sách thành viên: {membersError.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? submittingLabel : submitLabel}
          </Button>
          {submitting && (
            <span className="text-sm text-muted-foreground" role="status">
              Đang lưu, vui lòng đợi…
            </span>
          )}
        </div>
      </form>
    </>
  )
}
