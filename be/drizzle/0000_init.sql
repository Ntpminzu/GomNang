CREATE TYPE "public"."contribution_status" AS ENUM('proposed', 'committed', 'delivered', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."need_kind" AS ENUM('money', 'goods', 'labor', 'skill', 'venue');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'pending_verification', 'published', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."verdict" AS ENUM('PASS', 'NEEDS_INFO', 'FLAG');--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source" text NOT NULL,
	"verdict" "verdict" NOT NULL,
	"signals" jsonb NOT NULL,
	"similar_projects" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessments_source_valid" CHECK ("assessments"."source" IN ('rules', 'ai'))
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"from_state" text,
	"to_state" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"reason" text,
	"at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"need_item_id" uuid NOT NULL,
	"contributor_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"status" "contribution_status" DEFAULT 'committed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contributions_quantity_positive" CHECK ("contributions"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "need_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"label" text NOT NULL,
	"unit" text NOT NULL,
	"kind" "need_kind" NOT NULL,
	"target_qty" integer NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "need_items_target_positive" CHECK ("need_items"."target_qty" > 0)
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"goal" text NOT NULL,
	"beneficiary_group" text NOT NULL,
	"location" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"coordinator_id" uuid NOT NULL,
	"treasurer_id" uuid,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_treasurer_not_coordinator" CHECK ("projects"."treasurer_id" IS NULL OR "projects"."treasurer_id" <> "projects"."coordinator_id"),
	CONSTRAINT "projects_end_after_start" CHECK ("projects"."end_date" >= "projects"."start_date")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"is_verifier" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_need_item_id_need_items_id_fk" FOREIGN KEY ("need_item_id") REFERENCES "public"."need_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_contributor_id_users_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "need_items" ADD CONSTRAINT "need_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_coordinator_id_users_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_treasurer_id_users_id_fk" FOREIGN KEY ("treasurer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessments_project_idx" ON "assessments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "audit_log_project_at_idx" ON "audit_log" USING btree ("project_id","at");--> statement-breakpoint
CREATE INDEX "contributions_project_idx" ON "contributions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "contributions_need_idx" ON "contributions" USING btree ("need_item_id");--> statement-breakpoint
CREATE INDEX "need_items_project_idx" ON "need_items" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");