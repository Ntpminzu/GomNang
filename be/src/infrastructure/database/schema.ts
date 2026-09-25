import { sql } from 'drizzle-orm'
import { boolean, check, date, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import {
  CONTRIBUTION_STATUSES,
  NEED_KINDS,
  PROJECT_STATUSES,
  VERDICTS,
  type AssessmentSignal,
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

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  phone: text('phone'),
  passwordHash: text('password_hash'),
  verified: boolean('verified').notNull().default(false),
  isVerifier: boolean('is_verifier').notNull().default(false),
  createdAt: createdAt(),
})

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
    entityType: text('entity_type', { enum: ['project', 'contribution'] }).notNull(),
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
