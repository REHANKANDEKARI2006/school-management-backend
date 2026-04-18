import db from '../config/db.js';

export async function createHolidayTables() {
  try {
    // 1. Create custom_holidays table
    await db.query(`
      CREATE TABLE IF NOT EXISTS custom_holidays (
        id SERIAL PRIMARY KEY,
        holiday_name VARCHAR(100) NOT NULL,
        holiday_date DATE NOT NULL,
        category VARCHAR(50) CHECK (category IN ('National', 'School Holiday', 'Event')),
        description TEXT,
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('custom_holidays table ensured.');

    // 2. Create holiday_cache table
    await db.query(`
      CREATE TABLE IF NOT EXISTS holiday_cache (
        id SERIAL PRIMARY KEY,
        year INTEGER NOT NULL,
        holiday_data JSONB NOT NULL,
        source VARCHAR(50) NOT NULL, -- 'Google' or 'Calendarific'
        last_fetched_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(year, source)
      )
    `);
    console.log('holiday_cache table ensured.');

  } catch (error) {
    console.error('createHolidayTables error:', error);
    throw error;
  }
}

export async function dropHolidayTables() {
  try {
    await db.query('DROP TABLE IF EXISTS holiday_cache CASCADE');
    await db.query('DROP TABLE IF EXISTS custom_holidays CASCADE');
    console.log('holiday tables dropped.');
  } catch (error) {
    console.error('dropHolidayTables error:', error);
    throw error;
  }
}

// Auto-run if this script is executed directly (optional, but good for local testing)
// createHolidayTables();
