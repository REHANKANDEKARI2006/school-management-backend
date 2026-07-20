import db from '../config/db.js';

async function fixPaperSectionsSchema() {
  const client = await db.connect();
  try {
    console.log('🔧 Updating paper_sections table columns...');
    await client.query('ALTER TABLE paper_sections ADD COLUMN IF NOT EXISTS section_name VARCHAR(255)');
    await client.query('ALTER TABLE paper_sections ADD COLUMN IF NOT EXISTS total_section_marks DOUBLE PRECISION DEFAULT 0');
    
    // Sync section_name and title
    await client.query('UPDATE paper_sections SET section_name = title WHERE section_name IS NULL AND title IS NOT NULL');
    await client.query('UPDATE paper_sections SET title = section_name WHERE title IS NULL AND section_name IS NOT NULL');
    console.log('✅ paper_sections table updated.');

    console.log('🔧 Updating questions table columns...');
    await client.query('ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_data JSONB DEFAULT \'{}\'');
    await client.query('ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50) DEFAULT \'Medium\'');
    await client.query('ALTER TABLE questions ADD COLUMN IF NOT EXISTS answer_key TEXT');
    await client.query('ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation TEXT');
    await client.query('ALTER TABLE questions ADD COLUMN IF NOT EXISTS blooms_taxonomy VARCHAR(100)');
    console.log('✅ questions table updated.');

    console.log('\n=============================================');
    console.log('🎉 PAPER SECTIONS & QUESTIONS SCHEMA FIX COMPLETE! 🎉');
    console.log('=============================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    client.release();
    await db.end();
    process.exit(0);
  }
}

fixPaperSectionsSchema();
