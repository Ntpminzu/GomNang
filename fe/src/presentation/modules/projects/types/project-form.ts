import type { NeedKind, ProjectDetail, ProjectInput } from '@gomnang/domain/types.ts'
/** Trong form, số lượng giữ dạng chuỗi đúng như người dùng gõ; chỉ đổi sang số lúc gửi. */
export type NeedDraft = { label: string; unit: string; kind: NeedKind; targetQty: string }
export type FormState = Omit<ProjectInput, 'treasurerId' | 'needItems'> & { treasurerId: string; needItems: NeedDraft[] }

export const emptyNeed = (): NeedDraft => ({ label: '', unit: '', kind: 'goods', targetQty: '' })

export function toFormState(input?: ProjectInput): FormState {
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
export function toInput(form: FormState): ProjectInput {
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
