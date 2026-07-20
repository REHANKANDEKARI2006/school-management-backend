import db from '../config/db.js';

async function verify() {
  try {
    // Check if activity_log exists
    const r = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='activity_log'"
    );
    console.log('activity_log exists:', r.rows.length > 0);

    if (r.rows.length > 0) {
      const cols = await db.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name='activity_log'"
      );
      console.log('Columns:', cols.rows.map(c => c.column_name).join(', '));
    } else {
      console.log('Table missing! Creating...');
      await db.query(`
        CREATE TABLE activity_log (
          id             SERIAL PRIMARY KEY,
          user_id        INTEGER REFERENCES "user"(user_id) ON DELETE SET NULL,
          action_type    VARCHAR(20) NOT NULL,
          description    TEXT,
          institute_id   INTEGER REFERENCES institute(institute_id) ON DELETE SET NULL,
          created_at     TIMESTAMPTZ DEFAULT now()
        )
      `);
      console.log('Created activity_log!');
    }

    // Also check all other critical tables
    const tables = ['substitute_assignments', 'leave_applications', 'school_profile', 'fee_collection', 'fee_installment', 'student_submissions'];
    for (const t of tables) {
      const check = await db.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name=$1",
        [t]
      );
      console.log(`${t}: ${check.rows.length > 0 ? '✅ exists' : '❌ MISSING'}`);
    }

    // Check is_break on schedule
    const isBreakCheck = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='schedule' AND column_name='is_break'"
    );
    console.log(`schedule.is_break: ${isBreakCheck.rows.length > 0 ? '✅ exists' : '❌ MISSING'}`);

  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

verify();
