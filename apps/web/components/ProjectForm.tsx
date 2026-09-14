'use client'

import { useEffect, useState } from 'react'
import { NEED_KIND_LABEL, type Member, type NeedKind, type ProjectDetail, type ProjectInput } from '@gomnang/domain/types.ts'
import { todayInVietnam, validateProject, type FieldErrors } from '@gomnang/domain/validate-project.ts'
import { listMembers, readDemoModeFromUrl, toApiError, type ApiError, type DemoMode } from '@/lib/api.ts'
import { getSessionUser, type SessionUser } from '@/lib/session.ts'
import { DemoSwitch, EmptyState, ErrorAlert, Field, a11yProps } from './ui.tsx'

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
  demoBasePath: string
  submitLabel: string
  submittingLabel: string
  /** Ném ApiError nếu thất bại. Thành công thì trang cha tự chuyển sang trang dự án. */
  onSubmit: (input: ProjectInput, mode: DemoMode) => Promise<void>
}

export function ProjectForm({ initial, demoBasePath, submitLabel, submittingLabel, onSubmit }: Props) {
  const [mode, setMode] = useState<DemoMode>('normal')
  /** `undefined` = chưa đọc xong phiên; `null` = khách chưa đăng nhập. */
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined)
  const [members, setMembers] = useState<Member[] | null>(null)
  const [form, setForm] = useState<FormState>(() => toFormState(initial))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<ApiError | null>(null)

  useEffect(() => {
    setMode(readDemoModeFromUrl())
    const session = getSessionUser()
    setUser(session)
    // Danh sách thành viên là dữ liệu tra cứu, luôn nạp ở chế độ bình thường:
    // chế độ demo chỉ tác động lên lúc gửi form.
    if (session) listMembers('normal').then(setMembers, () => setMembers([]))
  }, [])

  if (user === undefined) return null
  if (user === null) {
    return (
      <>
        <DemoSwitch mode={mode} basePath={demoBasePath} />
        <EmptyState title="Cần chọn tài khoản">
          <p>Chọn một tài khoản mẫu ở góc trên bên phải để tạo hoặc sửa dự án.</p>
        </EmptyState>
      </>
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
    const found = validateProject(input, {
      today: todayInVietnam(),
      coordinatorId: me.id,
      treasurerVerified: input.treasurerId ? treasurer?.verified === true : undefined,
    })
    setSubmitError(null)
    showErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      await onSubmit(input, mode)
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
      <DemoSwitch mode={mode} basePath={demoBasePath} />

      {errorList.length > 0 && (
        <div className="alert alert-error" role="alert">
          <strong>Còn {errorList.length} chỗ cần sửa trước khi gửi:</strong>
          <ul>
            {errorList.map(([key, message]) => (
              <li key={key}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {submitError && (
        <>
          <ErrorAlert error={submitError} />
          <p className="muted">Nội dung bạn nhập vẫn còn nguyên bên dưới — bấm gửi lại khi mạng ổn định.</p>
        </>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="card">
          <Field id="name" label="Tên dự án" required error={errors.name} hint="Nêu rõ làm gì, cho ai, ở đâu.">
            <input
              {...a11yProps('name', errors.name, true)}
              type="text"
              maxLength={150}
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="100 phần cơm cho mái ấm Hoa Mai"
            />
          </Field>

          <Field id="goal" label="Mục tiêu" required error={errors.goal} hint="Kết quả cụ thể muốn đạt được, có con số càng tốt.">
            <textarea
              {...a11yProps('goal', errors.goal, true)}
              maxLength={2000}
              value={form.goal}
              onChange={(e) => update({ goal: e.target.value })}
            />
          </Field>

          <div className="row">
            <Field id="beneficiaryGroup" label="Nhóm thụ hưởng" required error={errors.beneficiaryGroup}>
              <select
                {...a11yProps('beneficiaryGroup', errors.beneficiaryGroup)}
                value={form.beneficiaryGroup}
                onChange={(e) => update({ beneficiaryGroup: e.target.value })}
              >
                <option value="">— chọn nhóm —</option>
                {BENEFICIARY_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="location" label="Địa điểm" required error={errors.location} hint="Ghi tới mức phường và điểm tập kết.">
              <input
                {...a11yProps('location', errors.location, true)}
                type="text"
                maxLength={300}
                value={form.location}
                onChange={(e) => update({ location: e.target.value })}
                placeholder="Phường Linh Trung, TP. Thủ Đức"
              />
            </Field>
          </div>

          <div className="row">
            <Field id="startDate" label="Ngày bắt đầu" required error={errors.startDate}>
              <input
                {...a11yProps('startDate', errors.startDate)}
                type="date"
                value={form.startDate}
                onChange={(e) => update({ startDate: e.target.value })}
              />
            </Field>
            <Field id="endDate" label="Ngày kết thúc" required error={errors.endDate}>
              <input
                {...a11yProps('endDate', errors.endDate)}
                type="date"
                value={form.endDate}
                onChange={(e) => update({ endDate: e.target.value })}
              />
            </Field>
          </div>
        </div>

        <h2>Nhu cầu cần kêu gọi</h2>
        {errors.needItems && (
          <p className="error-text" role="alert">
            {errors.needItems}
          </p>
        )}

        {form.needItems.map((need, i) => (
          <div className="need-editor" key={i}>
            <div className="need-row">
              <Field id={`needItems.${i}.label`} label="Hạng mục" required error={errors[`needItems.${i}.label`]}>
                <input
                  {...a11yProps(`needItems.${i}.label`, errors[`needItems.${i}.label`])}
                  type="text"
                  maxLength={100}
                  value={need.label}
                  onChange={(e) => updateNeed(i, { label: e.target.value })}
                  placeholder="Cơm"
                />
              </Field>
              <Field id={`needItems.${i}.unit`} label="Đơn vị" required error={errors[`needItems.${i}.unit`]}>
                <input
                  {...a11yProps(`needItems.${i}.unit`, errors[`needItems.${i}.unit`])}
                  type="text"
                  maxLength={30}
                  value={need.unit}
                  onChange={(e) => updateNeed(i, { unit: e.target.value })}
                  placeholder="phần"
                />
              </Field>
              <Field id={`needItems.${i}.kind`} label="Hình thức" required>
                <select
                  {...a11yProps(`needItems.${i}.kind`)}
                  value={need.kind}
                  onChange={(e) => updateNeed(i, { kind: e.target.value as NeedKind })}
                >
                  {Object.entries(NEED_KIND_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id={`needItems.${i}.targetQty`} label="Số lượng" required error={errors[`needItems.${i}.targetQty`]}>
                <input
                  {...a11yProps(`needItems.${i}.targetQty`, errors[`needItems.${i}.targetQty`])}
                  type="number"
                  inputMode="numeric"
                  value={need.targetQty}
                  onChange={(e) => updateNeed(i, { targetQty: e.target.value })}
                  placeholder="100"
                />
              </Field>
              <div className="field">
                <span className="sr-only">Thao tác</span>
                <button
                  type="button"
                  className="btn btn-danger-ghost"
                  onClick={() => setForm((f) => ({ ...f, needItems: f.needItems.filter((_, idx) => idx !== i) }))}
                  aria-label={`Xoá hạng mục ${i + 1}${need.label ? `: ${need.label}` : ''}`}
                  style={{ marginTop: '1.55rem' }}
                >
                  Xoá
                </button>
              </div>
            </div>
          </div>
        ))}

        <button type="button" className="btn" onClick={() => setForm((f) => ({ ...f, needItems: [...f.needItems, emptyNeed()] }))}>
          + Thêm hạng mục
        </button>

        <h2>Người phụ trách</h2>
        <div className="card">
          <div className="row">
            <div className="field">
              <span className="field-label">Người điều phối</span>
              <p style={{ margin: '.4rem 0 0' }}>{me.name}</p>
              <p className="hint">Người tạo dự án luôn là người điều phối.</p>
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
              <select
                {...a11yProps('treasurerId', errors.treasurerId, true)}
                value={form.treasurerId}
                onChange={(e) => update({ treasurerId: e.target.value })}
              >
                <option value="">— chưa chọn —</option>
                {(members ?? [])
                  .filter((m) => m.verified)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </Field>
          </div>
          <p className="muted" style={{ fontSize: '.83rem' }}>
            Danh sách chỉ hiện thành viên đã được xác minh danh tính.
            {members === null && ' Đang tải danh sách thành viên…'}
          </p>
        </div>

        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? submittingLabel : submitLabel}
          </button>
          {submitting && (
            <span className="muted" role="status">
              Đang lưu, vui lòng đợi…
            </span>
          )}
        </div>
      </form>
    </>
  )
}
