CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"name" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_size_limit" CHECK ("files"."size" > 0 AND "files"."size" <= 3145728),
	CONSTRAINT "files_mime_valid" CHECK ("files"."mime" IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf'))
);
--> statement-breakpoint
ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "receipt_file_id" uuid;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_project_idx" ON "files" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_receipt_file_id_files_id_fk" FOREIGN KEY ("receipt_file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "expenses_receipt_file_unique" ON "expenses" USING btree ("receipt_file_id");