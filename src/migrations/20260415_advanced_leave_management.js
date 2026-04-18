
import db from '../config/db.js';

export async function upgradeLeaveSystem() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    console.log('Creating leave_type table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_type (
        leave_type_id SERIAL PRIMARY KEY,
        type_name     VARCHAR(50) UNIQUE NOT NULL,
        max_days      INTEGER DEFAULT 12,
        is_paid       BOOLEAN DEFAULT true,
        created_at    TIMESTAMPTZ DEFAULT now()
      );
    `);

    console.log('Seeding leave_type defaults...');
    await client.query(`
      INSERT INTO leave_type (type_name, max_days, is_paid)
      VALUES 
        ('Casual Leave', 12, true),
        ('Sick Leave', 10, true),
        ('Earned Leave', 15, true),
        ('Emergency Leave', 5, true),
        ('Loss of Pay', 99, false),
        ('Half-Day Leave', 24, true)
      ON CONFLICT (type_name) DO NOTHING;
    `);

    console.log('Creating leave_balance table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_balance (
        balance_id     SERIAL PRIMARY KEY,
        staff_id       INTEGER NOT NULL,
        leave_type_id  INTEGER NOT NULL,
        total_days     DECIMAL(4,1) DEFAULT 0,
        used_days      DECIMAL(4,1) DEFAULT 0,
        available_days DECIMAL(4,1) DEFAULT 0,
        academic_year  VARCHAR(9) NOT NULL, -- e.g. '2025-2026'
        updated_at     TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT balance_staff_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id),
        CONSTRAINT balance_type_fkey FOREIGN KEY (leave_type_id) REFERENCES leave_type(leave_type_id),
        UNIQUE(staff_id, leave_type_id, academic_year)
      );
    `);

    console.log('Enhancing staff_leave table...');
    await client.query(`
      ALTER TABLE staff_leave 
      ADD COLUMN IF NOT EXISTS leave_type_id INTEGER REFERENCES leave_type(leave_type_id),
      ADD COLUMN IF NOT EXISTS document_url  TEXT,
      ADD COLUMN IF NOT EXISTS total_days    DECIMAL(4,1) DEFAULT 1,
      ADD COLUMN IF NOT EXISTS hod_status    INTEGER DEFAULT 1, -- 1: Pending, 2: Recommended, 3: Rejected
      ADD COLUMN IF NOT EXISTS principal_status INTEGER DEFAULT 1, -- 1: Pending, 2: Approved, 3: Rejected
      ADD COLUMN IF NOT EXISTS hod_remarks   TEXT,
      ADD COLUMN IF NOT EXISTS principal_remarks TEXT;
    `);

    console.log('Enhancing substitute_schedule table...');
    await client.query(`
      ALTER TABLE substitute_schedule
      ADD COLUMN IF NOT EXISTS status          INTEGER DEFAULT 1, -- 1: Suggested, 2: Accepted, 3: Declined
      ADD COLUMN IF NOT EXISTS priority_score  INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS leave_id        INTEGER REFERENCES staff_leave(leave_id);
    `);

    console.log('Initializing notification table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id SERIAL PRIMARY KEY,
        user_id         INTEGER NOT NULL, -- The recipient
        title           VARCHAR(255) NOT NULL,
        message         TEXT NOT NULL,
        type            VARCHAR(50), -- 'LEAVE_REQUEST', 'SUBSTITUTE_ASSIGNED', etc.
        link            VARCHAR(255), -- Deep link to a page
        is_read         BOOLEAN DEFAULT false,
        created_at      TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT notif_user_fkey FOREIGN KEY (user_id) REFERENCES "user"(user_id)
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Advanced Leave Management Migration Successful.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration Failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

// For manual execution via node
if (process.argv[1].endsWith('20260415_advanced_leave_management.js')) {
    upgradeLeaveSystem().then(() => process.exit(0)).catch(() => process.exit(1));
}
