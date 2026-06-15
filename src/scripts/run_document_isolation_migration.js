import db from '../config/db.js';

async function runMigration() {
  console.log("🚀 Starting document/template isolation migration...");
  try {
    await db.query("BEGIN");

    // 1. Isolate document_templates table
    console.log("Altering 'document_templates' table...");
    await db.query(`
      ALTER TABLE document_templates 
      ADD COLUMN IF NOT EXISTS institute_id INTEGER REFERENCES institute(institute_id);
    `);
    await db.query(`
      UPDATE document_templates 
      SET institute_id = 3 
      WHERE institute_id IS NULL;
    `);
    await db.query(`
      ALTER TABLE document_templates 
      ALTER COLUMN institute_id SET NOT NULL;
    `);

    // 2. Isolate template_custom_content table
    console.log("Altering 'template_custom_content' table...");
    await db.query(`
      ALTER TABLE template_custom_content 
      ADD COLUMN IF NOT EXISTS institute_id INTEGER REFERENCES institute(institute_id);
    `);
    await db.query(`
      UPDATE template_custom_content 
      SET institute_id = 3 
      WHERE institute_id IS NULL;
    `);
    
    // Drop unique constraint on (document_type, template_id, language) if it exists, and add new unique constraint including institute_id
    console.log("Updating constraints on 'template_custom_content'...");
    await db.query(`
      ALTER TABLE template_custom_content 
      DROP CONSTRAINT IF EXISTS template_custom_content_document_type_template_id_language_key;
    `);
    
    await db.query(`
      ALTER TABLE template_custom_content 
      DROP CONSTRAINT IF EXISTS template_custom_content_doc_type_temp_lang_inst_key;
    `);

    await db.query(`
      ALTER TABLE template_custom_content 
      ADD CONSTRAINT template_custom_content_doc_type_temp_lang_inst_key 
      UNIQUE (document_type, template_id, language, institute_id);
    `);

    await db.query(`
      ALTER TABLE template_custom_content 
      ALTER COLUMN institute_id SET NOT NULL;
    `);

    await db.query("COMMIT");
    console.log("✅ Document/template isolation migration completed successfully!");
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("❌ Migration failed! Transaction rolled back.", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();
