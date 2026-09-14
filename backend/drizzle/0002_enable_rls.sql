-- Supabase tự mở schema public qua Data API (PostgREST): ai có anon key của project là đọc/ghi được bảng.
-- Bật Row Level Security mà KHÔNG tạo policy nào = chặn toàn bộ truy cập qua đường đó.
-- Backend kết nối bằng role sở hữu bảng nên không bị ảnh hưởng. Trên PGlite và Postgres local, lệnh này vô hại.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "need_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "contributions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "assessments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
