// src/migrations/20260327_add_inst_labels_to_templates.js
import db from '../config/db.js';

export async function addInstLabelsToTemplates() {
  try {
    await db.query(`
      -- Add instructions and labels columns if they don't exist
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='paper_format_templates' AND column_name='instructions') THEN
          ALTER TABLE paper_format_templates ADD COLUMN instructions JSONB DEFAULT '[]';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='paper_format_templates' AND column_name='labels') THEN
          ALTER TABLE paper_format_templates ADD COLUMN labels JSONB DEFAULT '{}';
        END IF;
      END $$;
    `);

    console.log('✅ Added instructions and labels to paper_format_templates.');
  } catch (error) {
    console.error('addInstLabelsToTemplates error:', error);
    throw error;
  }
}

addInstLabelsToTemplates();
