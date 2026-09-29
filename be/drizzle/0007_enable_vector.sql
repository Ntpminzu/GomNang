-- Supabase/PostgreSQL cung cấp pgvector dưới tên extension "vector".
-- PGlite local nạp cùng extension từ @electric-sql/pglite-pgvector trước khi chạy migration.
CREATE EXTENSION IF NOT EXISTS vector;
