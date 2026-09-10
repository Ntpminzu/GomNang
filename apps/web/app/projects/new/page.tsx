'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createProject, fetchMembers, readDemoModeFromUrl, withDemoMode, type DemoMode } from '@/lib/api.ts'
import { CURRENT_USER_ID } from '@/lib/mock-data.ts'
import { NEED_KIND_LABEL, type Member, type NeedKind } from '@/lib/types.ts'
import {
  validateProjectForm,
  type FieldErrors,
  type NeedItemInput,
  type ProjectFormInput,
} from '@/lib/validate-project.ts'
import { DemoSwitch, Field, a11yProps } from '@/components/ui.tsx'

const BENEFICIARY_GROUPS = [
  'Người vô gia cư, người có hoàn cảnh khó khăn tại địa phương',
  'Trẻ em tại mái ấm',
  'Học sinh thiếu điều kiện học tập',
  'Cơ sở bảo trợ xã hội hoặc người cao tuổi neo đơn',
  'Cộng đồng chịu ảnh hưởng thiên tai',
  'Cộng đồng cần cải thiện môi trường sống',
]

const emptyNeed = (): NeedItemInput => ({ label: '', unit: '', kind: 'goods', targetQty: '' })

const emptyForm = (): ProjectFormInput => ({
  name: '',
  goal: '',
  beneficiaryGroup: '',
  location: '',
  startDate: '',
  endDate: '',
  coordinatorId: CURRENT_USER_ID,
  treasurerId: '',
  needItems: [emptyNeed()],
})

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'error'; message: string }
  | { status: 'success' }

export default function NewProjectPage() {
  const [mode, setMode] = useState<DemoMode>('normal')
  const [members, setMembers] = useState<Member[] | null>(null)
  const [form, setForm] = useState<ProjectFormInput>(emptyForm)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' })

  useEffect(() => {
    setMode(readDemoModeFromUrl())
    // Danh sách thành viên là dữ liệu tra cứu, luôn nạp ở chế độ bình thường:
    // chế độ demo chỉ tác động lên lời gọi lưu dự án bên dưới.
    fetchMembers('normal').then(setMembers)
  }, [])

  const hasMoneyItem = form.needItems.some((n) => n.kind === 'money')

  function update(patch: Partial<ProjectFormInput>) {
    setForm((f) => ({ ...f, ...patch }))
  }

  function updateNeed(index: number, patch: Partial<NeedItemInput>) {
    setForm((f) => ({
      ...f,
      needItems: f.needItems.map((n, i) => (i === index ? { ...n, ...patch } : n)),
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // Ngày hôm nay lấy tại thời điểm bấm nút, không lấy lúc render,
    // để tránh lệch giữa HTML dựng sẵn trên máy chủ và HTML trên trình duyệt.
    const today = new Date().toISOString().slice(0, 10)
    const found = validateProjectForm(form, today)
    setErrors(found)

    if (Object.keys(found).length > 0) {
      setSubmit({ status: 'idle' })
      document.getElementById(Object.keys(found)[0])?.focus()
      return
    }

    setSubmit({ status: 'submitting' })
    try {
      await createProject(mode)
      setSubmit({ status: 'success' })
      window.scrollTo({ top: 0 })
    } catch (err) {
      setSubmit({
        status: 'error',
        message: err instanceof Error ? err.message : 'Không lưu được dự án.',
      })
    }
  }

  if (submit.status === 'success') {
    return (
      <>
        <div className="alert alert-ok" role="alert">
          <strong>Đã tạo bản nháp dự án.</strong>
          <p style={{ margin: '.35rem 0 0' }}>
            Dự án đang ở trạng thái <em>Bản nháp</em>. Bước tiếp theo là gửi đi xác minh trước khi hiện công khai.
          </p>
        </div>
        <p className="muted">
          Tuần 3 chưa nối backend nên dự án chưa được lưu thật — màn hình này chỉ trình bày trạng thái thành công.
          Việc lưu thật sẽ có ở Homework 4A.
        </p>
        <div className="actions">
          <Link className="btn btn-primary" href={withDemoMode('/', mode)}>
            Về danh sách dự án
          </Link>
          <button
            className="btn"
            onClick={() => {
              setForm(emptyForm())
              setErrors({})
              setSubmit({ status: 'idle' })
            }}
          >
            Tạo dự án khác
          </button>
        </div>
      </>
    )
  }

  const errorList = Object.entries(errors)

  return (
    <>
      <div className="page-head">
        <h1>Tạo dự án thiện nguyện</h1>
        <p className="lead">
          Khai báo nhu cầu theo từng hạng mục có số lượng cụ thể, để người muốn giúp biết chính xác còn thiếu bao nhiêu.
        </p>
      </div>

      <DemoSwitch mode={mode} basePath="/projects/new" />

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

      {submit.status === 'error' && (
        <div className="alert alert-error" role="alert">
          <strong>Không lưu được dự án.</strong>
          <p style={{ margin: '.35rem 0 0' }}>{submit.message}</p>
          <p style={{ margin: '.35rem 0 0' }}>Nội dung bạn nhập vẫn còn nguyên bên dưới — bấm gửi lại khi mạng ổn định.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="card">
          <Field id="name" label="Tên dự án" required error={errors.name} hint="Nêu rõ làm gì, cho ai, ở đâu.">
            <input
              {...a11yProps('name', errors.name, true)}
              type="text"
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="100 phần cơm cho mái ấm Hoa Mai"
            />
          </Field>

          <Field
            id="goal"
            label="Mục tiêu"
            required
            error={errors.goal}
            hint="Mô tả kết quả cụ thể muốn đạt được. Tránh viết chung chung."
          >
            <textarea
              {...a11yProps('goal', errors.goal, true)}
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

            <Field
              id="location"
              label="Địa điểm"
              required
              error={errors.location}
              hint="Ghi tới mức phường và điểm tập kết."
            >
              <input
                {...a11yProps('location', errors.location, true)}
                type="text"
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
                  value={need.label}
                  onChange={(e) => updateNeed(i, { label: e.target.value })}
                  placeholder="Cơm"
                />
              </Field>

              <Field id={`needItems.${i}.unit`} label="Đơn vị" required error={errors[`needItems.${i}.unit`]}>
                <input
                  {...a11yProps(`needItems.${i}.unit`, errors[`needItems.${i}.unit`])}
                  type="text"
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

              <Field
                id={`needItems.${i}.targetQty`}
                label="Số lượng"
                required
                error={errors[`needItems.${i}.targetQty`]}
              >
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

        <button
          type="button"
          className="btn"
          onClick={() => setForm((f) => ({ ...f, needItems: [...f.needItems, emptyNeed()] }))}
        >
          + Thêm hạng mục
        </button>

        <h2>Người phụ trách</h2>
        <div className="card">
          <div className="row">
            <Field id="coordinatorId" label="Người điều phối" required>
              <select
                {...a11yProps('coordinatorId')}
                value={form.coordinatorId}
                onChange={(e) => update({ coordinatorId: e.target.value })}
              >
                {(members ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>

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
          <button type="submit" className="btn btn-primary" disabled={submit.status === 'submitting'}>
            {submit.status === 'submitting' ? 'Đang gửi…' : 'Tạo bản nháp dự án'}
          </button>
          <Link className="btn" href={withDemoMode('/', mode)}>
            Huỷ
          </Link>
          {submit.status === 'submitting' && (
            <span className="muted" role="status">
              Đang lưu, vui lòng đợi…
            </span>
          )}
        </div>
      </form>
    </>
  )
}
