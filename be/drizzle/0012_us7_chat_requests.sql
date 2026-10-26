CREATE TABLE "chat_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"requested_provider" text,
	"requested_model" text,
	"actual_model" text,
	"embedding_model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"query_prompt_version" text NOT NULL,
	"lifecycle" text DEFAULT 'pending' NOT NULL,
	"status" text,
	"reason_code" text,
	"http_status" integer,
	"origin" text,
	"model_calls" integer DEFAULT 0 NOT NULL,
	"embedding_calls" integer DEFAULT 0 NOT NULL,
	"embedded_documents" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"thinking_tokens" integer,
	"total_tokens" integer,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"latency_ms" integer,
	CONSTRAINT "chat_requests_lifecycle_valid" CHECK ("chat_requests"."lifecycle" IN ('pending', 'completed')),
	CONSTRAINT "chat_requests_status_valid" CHECK ("chat_requests"."status" IN ('answered', 'refused', 'failed')),
	CONSTRAINT "chat_requests_completion_valid" CHECK (("chat_requests"."lifecycle" = 'pending' AND "chat_requests"."status" IS NULL AND "chat_requests"."finished_at" IS NULL) OR ("chat_requests"."lifecycle" = 'completed' AND "chat_requests"."status" IS NOT NULL AND "chat_requests"."finished_at" IS NOT NULL AND "chat_requests"."reason_code" IS NOT NULL AND "chat_requests"."http_status" IS NOT NULL AND "chat_requests"."latency_ms" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "chat_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "chat_requests_request_id_idx" ON "chat_requests" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "chat_requests_started_at_idx" ON "chat_requests" USING btree ("started_at");--> statement-breakpoint
REVOKE ALL ON TABLE "chat_requests" FROM PUBLIC;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.chat_requests FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.chat_requests FROM authenticated;
  END IF;
END $$;
