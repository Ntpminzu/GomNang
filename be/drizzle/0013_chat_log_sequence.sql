-- Refuse incomplete legacy rows rather than inventing their result.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "chat_requests" WHERE "status" IS NULL OR "reason_code" IS NULL OR "http_status" IS NULL OR "finished_at" IS NULL OR "latency_ms" IS NULL) THEN
    RAISE EXCEPTION 'CHAT_LOG_INCOMPLETE_ROWS_REQUIRE_REVIEW';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "chat_requests" DROP CONSTRAINT "chat_requests_lifecycle_valid";
--> statement-breakpoint
ALTER TABLE "chat_requests" DROP CONSTRAINT "chat_requests_completion_valid";
--> statement-breakpoint
DROP INDEX "chat_requests_request_id_idx";
--> statement-breakpoint
ALTER TABLE "chat_requests" RENAME COLUMN "request_id" TO "legacy_request_id";
--> statement-breakpoint
ALTER TABLE "chat_requests" ADD COLUMN "request_id" integer;
--> statement-breakpoint
WITH ranked AS (
  SELECT "id", row_number() OVER (ORDER BY "started_at", "id")::integer AS number
  FROM "chat_requests"
)
UPDATE "chat_requests" AS target SET "request_id" = ranked.number FROM ranked WHERE target."id" = ranked."id";
--> statement-breakpoint
ALTER TABLE "chat_requests" ALTER COLUMN "request_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "chat_requests" ALTER COLUMN "request_id" ADD GENERATED ALWAYS AS IDENTITY (SEQUENCE NAME "chat_requests_request_id_seq");
--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('chat_requests', 'request_id'), COALESCE(MAX("request_id"), 1), COUNT(*) > 0) FROM "chat_requests";
--> statement-breakpoint
ALTER TABLE "chat_requests" DROP COLUMN "id";
--> statement-breakpoint
ALTER TABLE "chat_requests" ADD CONSTRAINT "chat_requests_pkey" PRIMARY KEY ("request_id");
--> statement-breakpoint
ALTER TABLE "chat_requests" DROP COLUMN "legacy_request_id";
--> statement-breakpoint
ALTER TABLE "chat_requests" DROP COLUMN "lifecycle";
--> statement-breakpoint
ALTER TABLE "chat_requests" DROP COLUMN "embedded_documents";
--> statement-breakpoint
ALTER TABLE "chat_requests" ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "chat_requests" ALTER COLUMN "reason_code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "chat_requests" ALTER COLUMN "http_status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "chat_requests" ALTER COLUMN "finished_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "chat_requests" ALTER COLUMN "latency_ms" SET NOT NULL;
--> statement-breakpoint
REVOKE ALL ON SEQUENCE "chat_requests_request_id_seq" FROM PUBLIC;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON SEQUENCE public.chat_requests_request_id_seq FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON SEQUENCE public.chat_requests_request_id_seq FROM authenticated;
  END IF;
END $$;
