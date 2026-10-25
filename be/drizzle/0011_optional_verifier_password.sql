-- Old limited tokens must never acquire full privileges after removing purpose.
UPDATE "auth_sessions" SET "revoked_at" = COALESCE("revoked_at", now()) WHERE "purpose" = 'password_change';--> statement-breakpoint
ALTER TABLE "auth_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "oauth_identities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auth_sessions" DROP COLUMN "purpose";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "must_change_password";--> statement-breakpoint
DROP TYPE "public"."session_purpose";
