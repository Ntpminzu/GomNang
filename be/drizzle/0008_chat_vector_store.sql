CREATE TABLE "chat_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" uuid,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"content" text NOT NULL,
	"content_hash" text NOT NULL,
	"embedding_model" text NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_chunks" ADD CONSTRAINT "chat_chunks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_chunks_project_idx" ON "chat_chunks" USING btree ("project_id");