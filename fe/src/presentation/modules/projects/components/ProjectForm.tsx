'use client'
import { useProjectForm } from '../hooks/use-project-form.ts'

import { NEED_KIND_LABEL, type NeedKind, type ProjectInput } from '@gomnang/domain/types.ts'
import type { DemoMode } from '@/libs/api/index.ts'
import { DemoSwitch, EmptyState, ErrorAlert, Field, a11yProps } from '../../../components/index.ts'

const BENEFICIARY_GROUPS = [
  'Người vô gia cư, người có hoàn cảnh khó khăn tại địa phương',
  'Trẻ em tại mái ấm',
  'Học sinh thiếu điều kiện học tập',
  'Cơ sở bảo trợ xã hội hoặc người cao tuổi neo đơn',
  'Cộng đồng chịu ảnh hưởng thiên tai',
  'Cộng đồng cần cải thiện môi trường sống',
]

import { emptyNeed } from '../types/project-form.ts'
export { detailToInput } from '../types/project-form.ts'

type Props = {
  initial?: ProjectInput
  demoBasePath: string
  submitLabel: string
  submittingLabel: string
  /** Ném ApiError nếu thất bại. Thành công thì trang cha tự chuyển sang trang dự án. */
  onSubmit: (input: ProjectInput, mode: DemoMode) => Promise<void>
}

export function ProjectForm({ initial, demoBasePath, submitLabel, submittingLabel, onSubmit }: Props) {
  const { mode, user, ready, members, membersError, setLookupAttempt, form, errors, submitting, submitError, hasMoneyItem, update, updateNeed, handleSubmit, errorList, setForm } = useProjectForm(initial, onSubmit)
  if (!ready) return null
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

  return (
    <>
      <ErrorAlert error={membersError} />
      {membersError && <button type="button" className="btn" onClick={() => setLookupAttempt((n) => n + 1)}>Tải lại danh sách thành viên</button>}
      {!members && !membersError && <p role="status">Đang tải danh sách thành viên…</p>}
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
              <p style={{ margin: '.4rem 0 0' }}>{user.name}</p>
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
          <button type="submit" className="btn btn-primary" disabled={submitting || !members}>
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

