'use client'

import { useEffect, useState } from 'react'
import { NEED_KIND_LABEL, type Member, type NeedKind, type ProjectDetail, type ProjectInput } from '@gomnang/domain/types.ts'
import { todayInVietnam, validateProject, type FieldErrors } from '@gomnang/domain/validate-project.ts'
import { listMembers, readDemoModeFromUrl, toApiError, type ApiError, type DemoMode } from '@/libs/api/index.ts'
import { useSession } from '../../../providers/SessionProvider.tsx'
import { DemoSwitch, EmptyState, ErrorAlert, Field, a11yProps } from '../../../components/index.ts'

import { emptyNeed, toFormState, toInput, type FormState, type NeedDraft } from '../types/project-form.ts'
export function useProjectForm(initial: ProjectInput | undefined, onSubmit: (input: ProjectInput, mode: DemoMode) => Promise<void>) {
  const [mode, setMode] = useState<DemoMode>('normal')
  /** `undefined` = chưa đọc xong phiên; `null` = khách chưa đăng nhập. */
  const { user, ready, revision } = useSession()
  const [membersError, setMembersError] = useState<ApiError | null>(null)
  const [lookupAttempt, setLookupAttempt] = useState(0)
  const [members, setMembers] = useState<Member[] | null>(null)
  const [form, setForm] = useState<FormState>(() => toFormState(initial))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<ApiError | null>(null)


  useEffect(() => {
    setMode(readDemoModeFromUrl())
    if (!ready || !user) return
    let cancelled = false
    setMembers(null)
    setMembersError(null)
    listMembers('normal').then(
      (result) => { if (!cancelled) setMembers(result) },
      (err) => { if (!cancelled) setMembersError(toApiError(err)) },
    )
    return () => { cancelled = true }
  }, [ready, revision, lookupAttempt])

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
    if (!members || !me) return
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
  return { mode, user, ready, members, membersError, setLookupAttempt, form, errors, submitting, submitError, hasMoneyItem, update, updateNeed, handleSubmit, errorList, setForm }
}
