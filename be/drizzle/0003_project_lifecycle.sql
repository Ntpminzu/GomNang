ALTER TYPE "public"."contribution_status" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."project_status" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "report" text;