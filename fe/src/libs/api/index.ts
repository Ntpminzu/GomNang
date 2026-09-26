import { isMockMode } from '../config/env.ts'
import type { ApiAdapter } from './contracts.ts'
import { httpApi } from './http/index.ts'
export * from './errors.ts'
export * from './demo.ts'
const mock: ApiAdapter = {
  listProjects: (...args) => import('./mock/index.ts').then((m) => m.mockApi.listProjects(...args)),
  getProject: (...args) => import('./mock/index.ts').then((m) => m.mockApi.getProject(...args)),
  createProject: (...args) => import('./mock/index.ts').then((m) => m.mockApi.createProject(...args)),
  updateProject: (...args) => import('./mock/index.ts').then((m) => m.mockApi.updateProject(...args)),
  listMembers: (...args) => import('./mock/index.ts').then((m) => m.mockApi.listMembers(...args)),
  getVerificationQueue: (...args) => import('./mock/index.ts').then((m) => m.mockApi.getVerificationQueue(...args)),
  submitProject: (...args) => import('./mock/index.ts').then((m) => m.mockApi.submitProject(...args)),
  reviewProject: (...args) => import('./mock/index.ts').then((m) => m.mockApi.reviewProject(...args)),
  startProject: (...args) => import('./mock/index.ts').then((m) => m.mockApi.startProject(...args)),
  completeProject: (...args) => import('./mock/index.ts').then((m) => m.mockApi.completeProject(...args)),
  cancelProject: (...args) => import('./mock/index.ts').then((m) => m.mockApi.cancelProject(...args)),
  commitContribution: (...args) => import('./mock/index.ts').then((m) => m.mockApi.commitContribution(...args)),
  transitionContribution: (...args) => import('./mock/index.ts').then((m) => m.mockApi.transitionContribution(...args)),
  postUpdate: (...args) => import('./mock/index.ts').then((m) => m.mockApi.postUpdate(...args)),
  recordExpense: (...args) => import('./mock/index.ts').then((m) => m.mockApi.recordExpense(...args)),
  reviewExpense: (...args) => import('./mock/index.ts').then((m) => m.mockApi.reviewExpense(...args))
}
const api = isMockMode ? mock : httpApi
export const { listProjects, getProject, createProject, updateProject, listMembers, getVerificationQueue, submitProject, reviewProject, startProject, completeProject, cancelProject, commitContribution, transitionContribution, postUpdate, recordExpense, reviewExpense } = api
export async function resetMockData() { if (isMockMode) (await import('./mock/index.ts')).resetMockData() }
