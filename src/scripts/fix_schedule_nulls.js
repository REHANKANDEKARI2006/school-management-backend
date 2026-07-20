import db from '../config/db.js';

async function fixScheduleNulls() {
  const client = await db.connect();
  try {
    console.log('🔧 Dropping NOT NULL constraint on staff_id and subject_id in schedule table...');
    await client.query('ALTER TABLE schedule ALTER COLUMN staff_id DROP NOT NULL');
    await client.query('ALTER TABLE schedule ALTER COLUMN subject_id DROP NOT NULL');
    console.log('✅ NOT NULL constraints dropped on schedule.staff_id and schedule.subject_id.');

    console.log('\n=============================================');
    console.log('🎉 SCHEDULE SCHEMA FIX COMPLETE! 🎉');
    console.log('=============================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    client.release();
    await db.end();
    process.exit(0);
  }
}

fixScheduleNulls();
