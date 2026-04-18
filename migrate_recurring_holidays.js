import pool from './src/config/db.js';

async function migrate() {
  console.log('--- Starting Recurring Holidays Migration ---');
  try {
    // 1. Create table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recurring_holidays (
        id SERIAL PRIMARY KEY,
        holiday_name VARCHAR(100) NOT NULL,
        day INTEGER NOT NULL,
        month INTEGER NOT NULL,
        state_tag VARCHAR(50) NOT NULL, -- 'Maharashtra', 'Karnataka', 'Both'
        category VARCHAR(50) DEFAULT 'State Holiday',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ Table "recurring_holidays" ensured.');

    // 2. Clear old data if exists (to avoid duplicates during re-runs)
    await pool.query('DELETE FROM recurring_holidays');

    // 3. Seed data
    const seedData = [
      ['Chhatrapati Shivaji Maharaj Jayanti', 19, 2, 'Maharashtra'],
      ['Gudi Padwa', 19, 3, 'Maharashtra'],
      ['Maharashtra Din and Kamgar Din', 1, 5, 'Maharashtra'],
      ['Marathi Rajyabhasha Din', 27, 2, 'Maharashtra'],
      ['Karnataka Rajyotsava', 1, 11, 'Karnataka']
    ];

    for (const [name, d, m, tag] of seedData) {
      await pool.query(
        'INSERT INTO recurring_holidays (holiday_name, day, month, state_tag) VALUES ($1, $2, $3, $4)',
        [name, d, m, tag]
      );
    }
    console.log('✅ Seeded 5 recurring holidays.');

  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
