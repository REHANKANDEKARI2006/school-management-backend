-- src/scripts/exam_soft_delete.sql
ALTER TABLE public.exam ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
