import type { ProjectListQuery, ProjectPage } from '@gomnang/domain/catalog.ts'
import type { Dashboard, Profile } from '@gomnang/domain/dashboard.ts'
import type { CancelInput, ChatProvider, CommitInput, CompleteInput, Contribution, Expense, ExpenseInput, ExpenseReviewInput, FileMeta, Member, ProjectDetail, ProjectInput, ProjectUpdate, QueueItem, ReviewInput, TransitionInput, UpdateInput } from '@gomnang/domain/types.ts'
import type { DemoMode } from './demo.ts'
export interface ApiAdapter {
  /** Danh sách công khai: tìm, lọc, sắp xếp, phân trang ở máy chủ. */
  listProjects(query?: ProjectListQuery, mode?: DemoMode): Promise<ProjectPage>
  getProject(id: string, mode?: DemoMode): Promise<ProjectDetail>
  listMembers(mode?: DemoMode): Promise<Member[]>
  getVerificationQueue(mode?: DemoMode): Promise<QueueItem[]>
  createProject(input: ProjectInput, mode?: DemoMode): Promise<ProjectDetail>
  updateProject(id: string, input: ProjectInput, mode?: DemoMode): Promise<ProjectDetail>
  /** Xoá mềm bản nháp (Q-03); chỉ người điều phối, chỉ khi còn là bản nháp. */
  deleteProject(id: string, mode?: DemoMode): Promise<void>
  submitProject(id: string, mode?: DemoMode): Promise<ProjectDetail>
  reviewProject(id: string, input: ReviewInput, mode?: DemoMode): Promise<ProjectDetail>
  /** Người xác minh nhờ AI soát hồ sơ (structured output); trả dự án kèm đánh giá mới nhất. */
  requestAiAssessment(id: string, input: { model: ChatProvider }, mode?: DemoMode): Promise<ProjectDetail>
  startProject(id: string, mode?: DemoMode): Promise<ProjectDetail>
  completeProject(id: string, input: CompleteInput, mode?: DemoMode): Promise<ProjectDetail>
  cancelProject(id: string, input: CancelInput, mode?: DemoMode): Promise<ProjectDetail>
  commitContribution(id: string, input: CommitInput, mode?: DemoMode): Promise<Contribution>
  transitionContribution(id: string, input: TransitionInput, mode?: DemoMode): Promise<Contribution>
  postUpdate(projectId: string, input: UpdateInput, mode?: DemoMode): Promise<ProjectUpdate>
  recordExpense(projectId: string, input: ExpenseInput, mode?: DemoMode): Promise<Expense>
  reviewExpense(id: string, input: ExpenseReviewInput, mode?: DemoMode): Promise<Expense>
  /** Người phụ trách tài chính tải chứng từ (ảnh/PDF ≤ 3 MB) trước khi ghi khoản chi. */
  uploadReceipt(projectId: string, file: Blob, name: string, mode?: DemoMode): Promise<FileMeta>
  /** Nội dung chứng từ theo quyền xem; dùng để xem trước trong trang. */
  getFile(id: string, mode?: DemoMode): Promise<Blob>
  getMyDashboard(mode?: DemoMode): Promise<Dashboard>
  getProfile(id: string, mode?: DemoMode): Promise<Profile>
}
