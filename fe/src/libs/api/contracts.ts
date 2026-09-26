import type { Dashboard, Profile } from '@gomnang/domain/dashboard.ts'
import type { CancelInput, CommitInput, CompleteInput, Contribution, Expense, ExpenseInput, ExpenseReviewInput, Member, ProjectDetail, ProjectInput, ProjectSummary, ProjectUpdate, QueueItem, ReviewInput, TransitionInput, UpdateInput } from '@gomnang/domain/types.ts'
import type { DemoMode } from './demo.ts'
export interface ApiAdapter {
  listProjects(mode?: DemoMode): Promise<ProjectSummary[]>
  getProject(id: string, mode?: DemoMode): Promise<ProjectDetail>
  listMembers(mode?: DemoMode): Promise<Member[]>
  getVerificationQueue(mode?: DemoMode): Promise<QueueItem[]>
  createProject(input: ProjectInput, mode?: DemoMode): Promise<ProjectDetail>
  updateProject(id: string, input: ProjectInput, mode?: DemoMode): Promise<ProjectDetail>
  submitProject(id: string, mode?: DemoMode): Promise<ProjectDetail>
  reviewProject(id: string, input: ReviewInput, mode?: DemoMode): Promise<ProjectDetail>
  startProject(id: string, mode?: DemoMode): Promise<ProjectDetail>
  completeProject(id: string, input: CompleteInput, mode?: DemoMode): Promise<ProjectDetail>
  cancelProject(id: string, input: CancelInput, mode?: DemoMode): Promise<ProjectDetail>
  commitContribution(id: string, input: CommitInput, mode?: DemoMode): Promise<Contribution>
  transitionContribution(id: string, input: TransitionInput, mode?: DemoMode): Promise<Contribution>
  postUpdate(projectId: string, input: UpdateInput, mode?: DemoMode): Promise<ProjectUpdate>
  recordExpense(projectId: string, input: ExpenseInput, mode?: DemoMode): Promise<Expense>
  reviewExpense(id: string, input: ExpenseReviewInput, mode?: DemoMode): Promise<Expense>
  getMyDashboard(mode?: DemoMode): Promise<Dashboard>
  getProfile(id: string, mode?: DemoMode): Promise<Profile>
}
