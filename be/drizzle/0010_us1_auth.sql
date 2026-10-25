-- Do not merge existing accounts to make the normalized unique index fit.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "users" GROUP BY lower(email) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'US1_EMAIL_COLLISION: resolve normalized email duplicates before migration';
  END IF;
END $$;--> statement-breakpoint
CREATE TYPE "public"."auth_method" AS ENUM('password', 'google', 'dev');--> statement-breakpoint
CREATE TYPE "public"."session_purpose" AS ENUM('full', 'password_change');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'verifier');--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "session_purpose" NOT NULL,
	"method" "auth_method" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"subject" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "verified" TO "identity_verified";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_identities" ADD CONSTRAINT "oauth_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_identity_subject_unique" ON "oauth_identities" USING btree ("provider","subject");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_identity_user_unique" ON "oauth_identities" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_normalized_unique" ON "users" USING btree (lower("email"));--> statement-breakpoint
UPDATE "users" SET "role" = 'verifier' WHERE "is_verifier" = true;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "is_verifier";
