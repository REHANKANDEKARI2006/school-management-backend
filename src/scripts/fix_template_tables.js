import db from '../config/db.js';

async function fixTemplateTables() {
  const client = await db.connect();
  try {
    console.log('🔧 Fixing document_templates columns...');
    await client.query('ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS content TEXT');
    await client.query('ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS character_limit INTEGER');
    console.log('✅ document_templates columns updated.');

    console.log('🔧 Creating template_custom_content table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS template_custom_content (
        id SERIAL PRIMARY KEY,
        document_type VARCHAR(50) NOT NULL,
        template_id VARCHAR(50) NOT NULL,
        language VARCHAR(20) NOT NULL,
        title TEXT,
        paragraph TEXT,
        remarks TEXT,
        institute_id INTEGER REFERENCES institute(institute_id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(document_type, template_id, language, institute_id)
      )
    `);
    console.log('✅ template_custom_content table created.');

    console.log('\n=============================================');
    console.log('🎉 TEMPLATE TABLES FIX COMPLETE! 🎉');
    console.log('=============================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    client.release();
    await db.end();
    process.exit(0);
  }
}

fixTemplateTables();
