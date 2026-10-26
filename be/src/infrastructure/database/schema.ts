import { sql } from 'drizzle-orm'
import { boolean, check, date, index, uniqueIndex, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, vector } from 'drizzle-orm/pg-core'
import {
  CONTRIBUTION_STATUSES,
  EXPENSE_STATUSES,
  NEED_KINDS,
  PROJECT_STATUSES,
  VERDICTS,
  ROLES,
  type AssessmentSignal,
  type Shift,
  type SimilarProject,
} from '@gomnang/domain/types.ts'

/**
 * Lược đồ database. Sửa file này rồi chạy `npm run db:generate` để sinh migration SQL mới.
 * Không sửa tay các file đã sinh trong ./drizzle.
 */

export const projectStatus = pgEnum('project_status', PROJECT_STATUSES)
export const needKind = pgEnum('need_kind', NEED_KINDS)
export const contributionStatus = pgEnum('contribution_status', CONTRIBUTION_STATUSES)
export const verdict = pgEnum('verdict', VERDICTS)
export const expenseStatus = pgEnum('expense_status', EXPENSE_STATUSES)

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()

export const userRole = pgEnum('user_role', ROLES)
export const authMethod = pgEnum('auth_method', ['password', 'google', 'dev'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  phone: text('phone'),
  passwordHash: text('password_hash'),
  identityVerified: boolean('identity_verified').notNull().default(false),
  role: userRole('role').notNull().default('user'),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('users_email_normalized_unique').on(sql`lower(${t.email})`)])

export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  method: authMethod('method').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index('auth_sessions_user_idx').on(t.userId)]).enableRLS()

export const oauthIdentities = pgTable('oauth_identities', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(),
  subject: text('subject').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex('oauth_identity_subject_unique').on(t.provider, t.subject),
  uniqueIndex('oauth_identity_user_unique').on(t.userId, t.provider),
]).enableRLS()

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    goal: text('goal').notNull(),
    beneficiaryGroup: text('beneficiary_group').notNull(),
    location: text('location').notNull(),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }).notNull(),
    status: projectStatus('status').notNull().default('draft'),
    coordinatorId: uuid('coordinator_id')
      .notNull()
      .references(() => users.id),
    treasurerId: uuid('treasurer_id').references(() => users.id),
    rejectionReason: text('rejection_reason'),
    // Báo cáo tổng kết, ghi khi người điều phối chốt dự án (Đang thực hiện → Đã hoàn thành).
    report: text('report'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // BR-003 được giữ ở cả tầng database: kể cả code có lỗi cũng không ghi được dữ liệu vi phạm.
    check('projects_treasurer_not_coordinator', sql`${t.treasurerId} IS NULL OR ${t.treasurerId} <> ${t.coordinatorId}`),
    check('projects_end_after_start', sql`${t.endDate} >= ${t.startDate}`),
    index('projects_status_idx').on(t.status),
  ],
)

/**
 * Chỉ mục RAG đã được embedding. Chỉ dữ liệu công khai mới được đồng bộ vào đây;
 * projectId null dành cho các hướng dẫn tĩnh ở trang /help.
 */
export const chatChunks = pgTable(
  'chat_chunks',
  {
    id: text('id').primaryKey(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    url: text('url').notNull(),
    content: text('content').notNull(),
    contentHash: text('content_hash').notNull(),
    embeddingModel: text('embedding_model').notNull(),
    embedding: vector('embedding', { dimensions: 1024 }).notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [index('chat_chunks_project_idx').on(t.projectId)],
)

/** Chỉ metadata vận hành AI; không lưu câu hỏi, history, output hoặc nội dung nguồn. */
export const chatRequests = pgTable('chat_requests', {
  requestId: integer('request_id').primaryKey().generatedAlwaysAsIdentity(),
  requestedProvider: text('requested_provider', { enum: ['ollama'] }),
  requestedModel: text('requested_model'),
  actualModel: text('actual_model'),
  embeddingModel: text('embedding_model').notNull(),
  promptVersion: text('prompt_version').notNull(),
  queryPromptVersion: text('query_prompt_version').notNull(),
  status: text('status', { enum: ['answered', 'refused', 'failed'] }).notNull(),
  reasonCode: text('reason_code').notNull(),
  httpStatus: integer('http_status').notNull(),
  origin: text('origin', { enum: ['rule', 'model'] }),
  modelCalls: integer('model_calls').notNull().default(0),
  embeddingCalls: integer('embedding_calls').notNull().default(0),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  thinkingTokens: integer('thinking_tokens'),
  totalTokens: integer('total_tokens'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }).notNull(),
  latencyMs: integer('latency_ms').notNull(),
}, (t) => [
  index('chat_requests_started_at_idx').on(t.startedAt),
  check('chat_requests_status_valid', sql`${t.status} IN ('answered', 'refused', 'failed')`),
]).enableRLS()

export const needItems = pgTable(
  'need_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    unit: text('unit').notNull(),
    kind: needKind('kind').notNull(),
    targetQty: integer('target_qty').notNull(),
    position: integer('position').notNull(),
    // Ca tình nguyện cho nhu cầu công sức / kỹ năng; null với các loại khác.
    shift: jsonb('shift').$type<Shift>(),
  },
  (t) => [check('need_items_target_positive', sql`${t.targetQty} > 0`), index('need_items_project_idx').on(t.projectId)],
)

export const contributions = pgTable(
  'contributions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    needItemId: uuid('need_item_id')
      .notNull()
      .references(() => needItems.id),
    contributorId: uuid('contributor_id')
      .notNull()
      .references(() => users.id),
    quantity: integer('quantity').notNull(),
    status: contributionStatus('status').notNull().default('committed'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('contributions_quantity_positive', sql`${t.quantity} > 0`),
    index('contributions_project_idx').on(t.projectId),
    index('contributions_need_idx').on(t.needItemId),
  ],
)

export const assessments = pgTable(
  'assessments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    source: text('source', { enum: ['rules', 'ai'] }).notNull(),
    verdict: verdict('verdict').notNull(),
    signals: jsonb('signals').$type<AssessmentSignal[]>().notNull(),
    similarProjects: jsonb('similar_projects').$type<SimilarProject[]>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [check('assessments_source_valid', sql`${t.source} IN ('rules', 'ai')`), index('assessments_project_idx').on(t.projectId)],
)

/**
 * Sổ ghi vết. Chỉ được INSERT — migration 0001 gắn trigger chặn UPDATE, DELETE và TRUNCATE ngay trong
 * PostgreSQL, nên kể cả người có quyền chạy SQL trực tiếp cũng không sửa được lịch sử qua đường thông thường.
 * Không có ON DELETE CASCADE: muốn xoá một dự án đã có vết thì database sẽ từ chối.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    entityType: text('entity_type', { enum: ['project', 'contribution', 'expense'] }).notNull(),
    entityId: uuid('entity_id').notNull(),
    fromState: text('from_state'),
    toState: text('to_state').notNull(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    reason: text('reason'),
    // clock_timestamp() thay vì now(): nhiều dòng ghi trong cùng một transaction vẫn có thời điểm khác nhau.
    at: timestamp('at', { withTimezone: true })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (t) => [index('audit_log_project_at_idx').on(t.projectId, t.at)],
)

/** Bảng tin của dự án: nhóm dự án đăng tiến độ cho người đã góp sức theo dõi. */
export const projectUpdates = pgTable(
  'project_updates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('project_updates_project_idx').on(t.projectId, t.createdAt)],
)

/**
 * Sổ chi công khai. Mỗi khoản trừ vào một hạng mục tiền; người phụ trách tài chính ghi, người điều phối duyệt.
 * Tách người ghi và người duyệt được giữ cả ở database, giống BR-003.
 */
export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    needItemId: uuid('need_item_id')
      .notNull()
      .references(() => needItems.id),
    amount: integer('amount').notNull(),
    description: text('description').notNull(),
    receiptUrl: text('receipt_url'),
    status: expenseStatus('status').notNull().default('pending'),
    recordedBy: uuid('recorded_by')
      .notNull()
      .references(() => users.id),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewReason: text('review_reason'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('expenses_amount_positive', sql`${t.amount} > 0`),
    check('expenses_reviewer_not_recorder', sql`${t.reviewedBy} IS NULL OR ${t.reviewedBy} <> ${t.recordedBy}`),
    index('expenses_project_idx').on(t.projectId),
  ],
)
