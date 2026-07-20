import db from '../config/db.js';

async function fixHolidaysSchema() {
  const client = await db.connect();
  try {
    console.log('🔧 Creating recurring_holidays table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS recurring_holidays (
        id           SERIAL PRIMARY KEY,
        holiday_name VARCHAR(150) NOT NULL,
        day          INTEGER NOT NULL,
        month        INTEGER NOT NULL,
        state_tag    VARCHAR(50),
        is_active    BOOLEAN DEFAULT true,
        created_at   TIMESTAMPTZ DEFAULT now(),
        updated_at   TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ recurring_holidays table created.');

    console.log('\n=============================================');
    console.log('🎉 RECURRING HOLIDAYS SCHEMA FIX COMPLETE! 🎉');
    console.log('=============================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    client.release();
    await db.end();
    process.exit(0);
  }
}

fixHolidaysSchema();
