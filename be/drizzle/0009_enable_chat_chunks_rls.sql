-- Vector và nội dung chunk chỉ được backend truy cập; Supabase anon không có policy đọc bảng này.
ALTER TABLE "chat_chunks" ENABLE ROW LEVEL SECURITY;
