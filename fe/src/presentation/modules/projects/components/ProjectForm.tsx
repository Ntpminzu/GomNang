'use client'

import { AlertCircle, Plus, Sparkles, Trash2 } from 'lucide-react'
import { NEED_KIND_LABEL, NEED_KINDS, type NeedKind, type ProjectInput } from '@gomnang/domain/types.ts'
import type { DemoMode } from '@/libs/api/index.ts'
import { cn } from '@/libs/utils/cn.ts'
import { Alert, AlertDescription, AlertTitle } from '@/presentation/components/ui/alert.tsx'
import { Button } from '@/presentation/components/ui/button.tsx'
import { Input } from '@/presentation/components/ui/input.tsx'
import { NativeSelect, NativeSelectOption } from '@/presentation/components/ui/native-select.tsx'
import { Textarea } from '@/presentation/components/ui/textarea.tsx'
import { DemoSwitch, EmptyState, ErrorAlert, Field, a11yProps } from '../../../components/index.ts'
import { useProjectForm } from '../hooks/use-project-form.ts'
import { emptyNeed } from '../types/project-form.ts'
import { BENEFICIARY_GROUPS, PROJECT_TEMPLATES, UNIT_SUGGESTIONS } from '../types/project-templates.ts'
import { NEED_KIND_ICON } from './status.tsx'
export { detailToInput } from '../types/project-form.ts'

type Props = {
  initial?: ProjectInput
  demoBasePath: string
  submitLabel: string
  submittingLabel: string
  /** Ném ApiError nếu thất bại. Thành công thì trang cha tự chuyển sang trang dự án. */
  onSubmit: (input: ProjectInput, mode: DemoMode) => Promise<void>
}

function Section({ step, title, description, children }: { step: number; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby={`form-step-${step}`}>
      <div className="mb-5 flex gap-3">
        <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {step}
        </span>
        <div>
          <h2 id={`form-step-${step}`} className="font-semibold">
            {title}
          </h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

export function ProjectForm({ initial, demoBasePath, submitLabel, submittingLabel, onSubmit }: Props) {
  const { mode, user, ready, members, membersError, setLookupAttempt, form, errors, submitting, submitError, hasMoneyItem, update, updateNeed, handleSubmit, errorList, setForm } =
    useProjectForm(initial, onSubmit)
  if (!ready) return null
  if (user === null) {
    return (
      <>
        <DemoSwitch mode={mode} basePath={demoBasePath} />
        <EmptyState title="Cần đăng nhập">
          <p>Đăng nhập để tạo hoặc sửa dự án.</p>
          <Button asChild>
            <a href={`/login?next=${encodeURIComponent(demoBasePath)}`}>Đăng nhập</a>
          </Button>
        </EmptyState>
      </>
    )
  }

  const applyTemplate = (id: string) => {
    const template = PROJECT_TEMPLATES.find((t) => t.id === id)
    if (!template) return
    const typed = form.needItems.some((n) => n.label.trim() || n.targetQty.trim())
    if (typed && !window.confirm('Thay danh sách nhu cầu đang nhập bằng danh sách của mẫu?')) return
    setForm((f) => ({
      ...f,
      beneficiaryGroup: f.beneficiaryGroup || template.beneficiaryGroup,
      needItems: template.needs.map((n) => ({ ...n, targetQty: String(n.targetQty) })),
    }))
  }

  const changeKind = (i: number, kind: NeedKind) => {
    const current = form.needItems[i]
    // Đơn vị đang để trống hoặc là đơn vị gợi ý của loại cũ thì đổi theo loại mới; đơn vị tự gõ thì giữ nguyên.
    const keepUnit = current.unit.trim() && !UNIT_SUGGESTIONS[current.kind].includes(current.unit)
    updateNeed(i, { kind, unit: keepUnit ? current.unit : UNIT_SUGGESTIONS[kind][0] })
  }

  return (
    <>
      <DemoSwitch mode={mode} basePath={demoBasePath} />
      {membersError && (
        <div className="mb-4">
          <ErrorAlert error={membersError} />
          <Button variant="outline" onClick={() => setLookupAttempt((n) => n + 1)}>
            Tải lại danh sách thành viên
          </Button>
        </div>
      )}

      {errorList.length > 0 && (
        <Alert variant="destructive" className="mb-5 border-destructive/40 bg-destructive/5" tabIndex={-1}>
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Còn {errorList.length} chỗ cần sửa trước khi gửi</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-0.5 pl-4">
              {errorList.map(([key, message]) => (
                <li key={key}>
                  <a
                    href={`#${key}`}
                    className="underline underline-offset-2"
                    onClick={(e) => {
                      e.preventDefault()
                      document.getElementById(key)?.focus()
                    }}
                  >
                    {message}
                  </a>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {submitError && (
        <div className="mb-5">
          <ErrorAlert error={submitError} />
          <p className="text-sm text-muted-foreground">Nội dung bạn nhập vẫn còn nguyên bên dưới — bấm gửi lại khi mạng ổn định.</p>
        </div>
      )}

      {!initial && (
        <div className="mb-5 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            Bắt đầu nhanh từ mẫu — điền sẵn nhóm thụ hưởng và nhu cầu gợi ý
          </p>
          <div className="flex flex-wrap gap-2">
            {PROJECT_TEMPLATES.map((t) => (
              <Button key={t.id} type="button" variant="outline" size="lg" className="bg-card" onClick={() => applyTemplate(t.id)}>
                {t.title}
              </Button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Section step={1} title="Thông tin dự án" description="Người đọc cần biết làm gì, cho ai, ở đâu, khi nào.">
          <Field id="name" label="Tên dự án" required error={errors.name} hint="Nêu rõ làm gì, cho ai, ở đâu.">
            <Input
              {...a11yProps('name', errors.name, true)}
              type="text"
              maxLength={150}
              className="h-11 text-base"
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="100 phần cơm cho mái ấm Hoa Mai"
            />
          </Field>

          <Field id="goal" label="Mục tiêu" required error={errors.goal} hint="Kết quả cụ thể muốn đạt được, có con số càng tốt.">
            <Textarea
              {...a11yProps('goal', errors.goal, true)}
              maxLength={2000}
              className="min-h-24 text-base"
              value={form.goal}
              onChange={(e) => update({ goal: e.target.value })}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="beneficiaryGroup" label="Nhóm thụ hưởng" required error={errors.beneficiaryGroup}>
              <NativeSelect
                {...a11yProps('beneficiaryGroup', errors.beneficiaryGroup)}
                className="h-11 w-full"
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
            </Field>

            <Field id="location" label="Địa điểm" required error={errors.location} hint="Ghi tới mức phường và điểm tập kết.">
              <Input
                {...a11yProps('location', errors.location, true)}
                type="text"
                maxLength={300}
                className="h-11 text-base"
                value={form.location}
                onChange={(e) => update({ location: e.target.value })}
                placeholder="Phường Linh Trung, TP. Thủ Đức"
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="startDate" label="Ngày bắt đầu" required error={errors.startDate}>
              <Input
                {...a11yProps('startDate', errors.startDate)}
                type="date"
                className="h-11 text-base"
                value={form.startDate}
                onChange={(e) => {
                  const startDate = e.target.value
                  // Hoạt động một ngày là phổ biến nhất: ngày kết thúc chưa có hoặc đứng trước ngày bắt đầu thì đặt bằng ngày bắt đầu.
                  update({ startDate, ...(!form.endDate || form.endDate < startDate ? { endDate: startDate } : {}) })
                }}
              />
            </Field>
            <Field id="endDate" label="Ngày kết thúc" required error={errors.endDate}>
              <Input
                {...a11yProps('endDate', errors.endDate)}
                type="date"
                className="h-11 text-base"
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={(e) => update({ endDate: e.target.value })}
              />
            </Field>
          </div>
        </Section>

        <Section step={2} title="Nhu cầu cần kêu gọi" description="Mỗi hạng mục một con số cụ thể — người đóng góp sẽ nhận từng phần.">
          {errors.needItems && (
            <p className="text-sm text-destructive" role="alert">
              {errors.needItems}
            </p>
          )}
          <ul className="space-y-3">
            {form.needItems.map((need, i) => (
              <li key={i} className="rounded-xl border bg-muted/40 p-4">
                <fieldset>
                  <legend className="sr-only">Hạng mục {i + 1}</legend>
                  <div role="radiogroup" aria-label={`Loại nhu cầu của hạng mục ${i + 1}`} className="mb-4 flex flex-wrap gap-1.5">
                    {NEED_KINDS.map((kind) => {
                      const Icon = NEED_KIND_ICON[kind]
                      const checked = need.kind === kind
                      return (
                        <button
                          key={kind}
                          type="button"
                          role="radio"
                          aria-checked={checked}
                          onClick={() => changeKind(i, kind)}
                          className={cn(
                            'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors',
                            checked ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
                          )}
                        >
                          <Icon className="size-4" aria-hidden="true" />
                          {NEED_KIND_LABEL[kind]}
                        </button>
                      )
                    })}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
                    <Field id={`needItems.${i}.label`} label="Hạng mục" required error={errors[`needItems.${i}.label`]}>
                      <Input
                        {...a11yProps(`needItems.${i}.label`, errors[`needItems.${i}.label`])}
                        type="text"
                        maxLength={100}
                        className="h-10 bg-card"
                        value={need.label}
                        onChange={(e) => updateNeed(i, { label: e.target.value })}
                        placeholder="Suất cơm"
                      />
                    </Field>
                    <Field id={`needItems.${i}.unit`} label="Đơn vị" required error={errors[`needItems.${i}.unit`]}>
                      <Input
                        {...a11yProps(`needItems.${i}.unit`, errors[`needItems.${i}.unit`])}
                        type="text"
                        maxLength={30}
                        list={`units-${need.kind}`}
                        className="h-10 bg-card"
                        value={need.unit}
                        onChange={(e) => updateNeed(i, { unit: e.target.value })}
                        placeholder={UNIT_SUGGESTIONS[need.kind][0]}
                      />
                    </Field>
                    <Field id={`needItems.${i}.targetQty`} label="Số lượng" required error={errors[`needItems.${i}.targetQty`]}>
                      <Input
                        {...a11yProps(`needItems.${i}.targetQty`, errors[`needItems.${i}.targetQty`])}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        className="h-10 bg-card tabular-nums"
                        value={need.targetQty}
                        onChange={(e) => updateNeed(i, { targetQty: e.target.value })}
                        placeholder="100"
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setForm((f) => ({ ...f, needItems: f.needItems.filter((_, idx) => idx !== i) }))}
                      aria-label={`Xoá hạng mục ${i + 1}${need.label ? `: ${need.label}` : ''}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </fieldset>
              </li>
            ))}
          </ul>
          {NEED_KINDS.map((kind) => (
            <datalist key={kind} id={`units-${kind}`}>
              {UNIT_SUGGESTIONS[kind].map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          ))}
          <Button type="button" variant="outline" size="lg" onClick={() => setForm((f) => ({ ...f, needItems: [...f.needItems, emptyNeed()] }))}>
            <Plus aria-hidden="true" />
            Thêm hạng mục
          </Button>
        </Section>

        <Section step={3} title="Người phụ trách" description="Tách người điều phối và người giữ tiền — nguyên tắc minh bạch của nền tảng.">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm font-medium">Người điều phối</p>
              <p className="flex h-11 items-center rounded-lg border bg-muted/50 px-3">{user.name}</p>
              <p className="text-sm text-muted-foreground">Người tạo dự án luôn là người điều phối.</p>
            </div>
            <Field
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
                className="h-11 w-full"
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
            </Field>
          </div>
          <p className="text-sm text-muted-foreground" role="status">
            Danh sách chỉ hiện thành viên đã được xác minh danh tính.
            {members === null && !membersError && ' Đang tải danh sách thành viên…'}
          </p>
        </Section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="cta" size="xl" disabled={submitting || !members}>
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
