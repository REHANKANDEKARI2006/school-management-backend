import pool from './src/config/db.js';

async function migrate() {
  // 1. Create expenses table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      expense_id SERIAL PRIMARY KEY,
      expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
      category VARCHAR(50) NOT NULL CHECK (category IN ('salary', 'maintenance', 'utilities', 'supplies', 'other')),
      amount NUMERIC(12,2) NOT NULL,
      description TEXT,
      added_by INTEGER REFERENCES "user"(user_id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('Created: expenses table');

  // 2. Create activity_log table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_log (
      log_id SERIAL PRIMARY KEY,
      action_type VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      user_id INTEGER REFERENCES "user"(user_id),
      related_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('Created: activity_log table');

  console.log('Migration complete.');
  process.exit();
}

migrate().catch(e => { console.error(e); process.exit(1); });
