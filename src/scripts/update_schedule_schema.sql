-- Add is_break column
ALTER TABLE schedule ADD COLUMN IF NOT EXISTS is_break BOOLEAN DEFAULT FALSE;

-- Allow empty slots (null staff and null subject) for breaks or free periods
ALTER TABLE schedule ALTER COLUMN staff_id DROP NOT NULL;
ALTER TABLE schedule ALTER COLUMN subject_id DROP NOT NULL;
