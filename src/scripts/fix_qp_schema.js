import db from '../config/db.js';

async function fixQpSchema() {
  const client = await db.connect();
  try {
    console.log('🔧 Adding missing columns to question_papers table...');
    await client.query('ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES class(class_id)');
    await client.query('ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS subject_id INTEGER REFERENCES subject(subject_id)');
    await client.query('ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS exam_id INTEGER REFERENCES exam(exam_id)');
    await client.query('ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE');
    await client.query('ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS instructions TEXT');

    // Make class_name, subject nullable if they had NOT NULL constraint
    await client.query('ALTER TABLE question_papers ALTER COLUMN class_name DROP NOT NULL').catch(() => {});
    await client.query('ALTER TABLE question_papers ALTER COLUMN subject DROP NOT NULL').catch(() => {});

    console.log('✅ question_papers columns updated successfully!');

    // Create paper_sections & questions tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS paper_sections (
        section_id    SERIAL PRIMARY KEY,
        paper_id      INTEGER NOT NULL REFERENCES question_papers(paper_id) ON DELETE CASCADE,
        title         VARCHAR(255),
        instructions  TEXT,
        section_order INTEGER DEFAULT 1,
        created_at    TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        question_id   SERIAL PRIMARY KEY,
        section_id    INTEGER NOT NULL REFERENCES paper_sections(section_id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        question_type VARCHAR(50) DEFAULT 'subjective',
        marks         DOUBLE PRECISION DEFAULT 1,
        options       JSONB DEFAULT '[]',
        question_order INTEGER DEFAULT 1,
        created_at    TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ paper_sections and questions tables verified.');

    console.log('\n=============================================');
    console.log('🎉 QUESTION PAPERS SCHEMA FIX COMPLETE! 🎉');
    console.log('=============================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    client.release();
    await db.end();
    process.exit(0);
  }
}

fixQpSchema();
