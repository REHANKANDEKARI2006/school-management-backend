import db from '../config/db.js';

async function inspectAndFix() {
  const client = await db.connect();
  try {
    console.log('🔧 Adding missing columns to document_templates...');
    await client.query('ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS institute_id INTEGER REFERENCES institute(institute_id)');
    await client.query('ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES "user"(user_id)');
    await client.query('ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS template_name VARCHAR(150)');
    await client.query('ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS base_template_id VARCHAR(50) DEFAULT \'template1\'');
    await client.query('ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS content TEXT');
    await client.query('ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS character_limit INTEGER');
    await client.query('ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS language VARCHAR(20) DEFAULT \'en\'');
    await client.query('ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE');

    const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='document_templates'");
    console.log('Final columns in document_templates:', cols.rows.map(c => c.column_name).join(', '));
    console.log('✅ document_templates columns fixed successfully!');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    client.release();
    await db.end();
    process.exit(0);
  }
}

inspectAndFix();
