CREATE TABLE "ai_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"tools" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attempts" integer NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"latency_ms" integer NOT NULL,
	"cost_usd" double precision NOT NULL,
	"outcome" text NOT NULL,
	"error_code" text,
	"project_id" uuid,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "ai_request_id" uuid;--> statement-breakpoint
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_requests_feature_at_idx" ON "ai_requests" USING btree ("feature","created_at");--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_ai_request_id_ai_requests_id_fk" FOREIGN KEY ("ai_request_id") REFERENCES "public"."ai_requests"("id") ON DELETE no action ON UPDATE no action;