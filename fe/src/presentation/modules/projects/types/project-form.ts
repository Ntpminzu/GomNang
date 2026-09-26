import { SHIFT_KINDS, type NeedKind, type ProjectDetail, type ProjectInput, type Shift } from '@gomnang/domain/types.ts'
/** Trong form, số lượng giữ dạng chuỗi đúng như người dùng gõ; chỉ đổi sang số lúc gửi. */
export type NeedDraft = { label: string; unit: string; kind: NeedKind; targetQty: string; shift: Shift | null }
export type FormState = Omit<ProjectInput, 'treasurerId' | 'needItems'> & { treasurerId: string; needItems: NeedDraft[] }

export const emptyNeed = (): NeedDraft => ({ label: '', unit: '', kind: 'goods', targetQty: '', shift: null })

export function toFormState(input?: ProjectInput): FormState {
  if (!input) {
    return { name: '', goal: '', beneficiaryGroup: '', location: '', startDate: '', endDate: '', treasurerId: '', needItems: [emptyNeed()] }
  }
  return {
    ...input,
    treasurerId: input.treasurerId ?? '',
    needItems: input.needItems.map((n) => ({ ...n, targetQty: String(n.targetQty), shift: n.shift ?? null })),
  }
}

/** Ô số để trống thành NaN, để quy tắc báo "phải là số nguyên lớn hơn 0" thay vì lặng lẽ thành 0. */
export function toInput(form: FormState): ProjectInput {
  return {
    ...form,
    treasurerId: form.treasurerId || null,
    needItems: form.needItems.map((n) => ({
      ...n,
      targetQty: n.targetQty.trim() === '' ? Number.NaN : Number(n.targetQty),
      // Đổi loại nhu cầu sang loại không có ca thì bỏ ca đi, khỏi báo lỗi thừa.
      shift: SHIFT_KINDS.includes(n.kind) && n.shift ? { ...n.shift, place: n.shift.place.trim() } : null,
    })),
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
    needItems: project.needs.map(({ label, unit, kind, targetQty, shift }) => ({ label, unit, kind, targetQty, shift })),
  }
}
