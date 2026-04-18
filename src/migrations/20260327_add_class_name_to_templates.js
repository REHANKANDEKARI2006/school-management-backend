// src/migrations/20260327_add_class_name_to_templates.js
import db from '../config/db.js';

export async function addClassNameToTemplates() {
  try {
    await db.query(`
      -- Add class_name column if it doesn't exist
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='paper_format_templates' AND column_name='class_name') THEN
          ALTER TABLE paper_format_templates ADD COLUMN class_name VARCHAR(50);
        END IF;
      END $$;

      -- Update unique constraint to include class_name
      ALTER TABLE paper_format_templates DROP CONSTRAINT IF EXISTS paper_format_templates_class_group_subject_exam_type_key;
      
      -- Add new constraint. We use a partial unique index or just allow either class_name or class_group to be null.
      -- However, the user wants per-standard, so class_name is better.
      -- To avoid duplicates, we'll create a UNIQUE constraint on (COALESCE(class_name, class_group), subject, exam_type)
      -- but PostgreSQL doesn't support expressions in UNIQUE constraints directly.
      -- We'll use a UNIQUE index instead.
      
      DROP INDEX IF EXISTS idx_paper_format_unique;
      CREATE UNIQUE INDEX idx_paper_format_unique ON paper_format_templates (COALESCE(class_name, ''), class_group, subject, COALESCE(exam_type, ''));
    `);

    console.log('✅ Added class_name to paper_format_templates and updated constraints.');
  } catch (error) {
    console.error('addClassNameToTemplates error:', error);
    throw error;
  }
}

addClassNameToTemplates();
