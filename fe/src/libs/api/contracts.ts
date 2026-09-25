import type { CommitInput, Contribution, Member, ProjectDetail, ProjectInput, ProjectSummary, QueueItem, ReviewInput, TransitionTarget } from '@gomnang/domain/types.ts'
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
  commitContribution(id: string, input: CommitInput, mode?: DemoMode): Promise<Contribution>
  transitionContribution(id: string, to: TransitionTarget, mode?: DemoMode): Promise<Contribution>
}
