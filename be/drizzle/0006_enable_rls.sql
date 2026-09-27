-- Bật Row Level Security cho mọi bảng, không tạo policy nào: trên Supabase, REST API công khai (khoá anon)
-- không đọc/ghi được bảng; chỉ backend (chủ sở hữu bảng, bỏ qua RLS) truy cập và tự kiểm quyền.
-- Sáu bảng cũ đã được bật tay khi chuyển dữ liệu (docs/supabase.md); hai bảng mới của migration 0004 thì chưa.
-- Bật lại trên bảng đã bật là vô hại.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "need_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contributions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assessments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_updates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
