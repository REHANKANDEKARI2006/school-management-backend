import db from '../config/db.js';

async function inspectAndFixSS() {
  const client = await db.connect();
  try {
    const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='student_submissions'");
    console.log('Current columns in student_submissions:', cols.rows.map(c => c.column_name));

    console.log('🔧 Adding missing columns to student_submissions...');
    await client.query('ALTER TABLE student_submissions ADD COLUMN IF NOT EXISTS material_id INTEGER REFERENCES materials(material_id) ON DELETE CASCADE');
    await client.query('ALTER TABLE student_submissions ADD COLUMN IF NOT EXISTS student_id INTEGER REFERENCES student(student_id) ON DELETE CASCADE');
    await client.query('ALTER TABLE student_submissions ADD COLUMN IF NOT EXISTS file_path VARCHAR(255)');
    await client.query('ALTER TABLE student_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT now()');
    await client.query('ALTER TABLE student_submissions ADD COLUMN IF NOT EXISTS grade VARCHAR(10)');
    await client.query('ALTER TABLE student_submissions ADD COLUMN IF NOT EXISTS feedback TEXT');

    const finalCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='student_submissions'");
    console.log('Final columns in student_submissions:', finalCols.rows.map(c => c.column_name).join(', '));
    console.log('✅ student_submissions table fixed successfully!');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    client.release();
    await db.end();
    process.exit(0);
  }
}

inspectAndFixSS();
