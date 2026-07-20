import db from '../config/db.js';

async function fixNoticesSchema() {
  const client = await db.connect();
  try {
    console.log('🔧 Adding missing columns to notices table...');
    await client.query('ALTER TABLE notices ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES class(class_id)');
    await client.query('ALTER TABLE notices ADD COLUMN IF NOT EXISTS class_ids INTEGER[] DEFAULT \'{}\'');
    console.log('✅ notices columns updated.');

    console.log('\n=============================================');
    console.log('🎉 NOTICES SCHEMA FIX COMPLETE! 🎉');
    console.log('=============================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    client.release();
    await db.end();
    process.exit(0);
  }
}

fixNoticesSchema();
