/**
 * 20260417_leave_rebuild.js
 * Complete Leave Management System — schema rebuild from scratch.
 *
 * Drops: staff_leave, substitute_schedule (old broken tables)
 * Creates: leave_types, leave_balance, leave_applications,
 *          substitute_assignments, enhances notifications table
 * Seeds: leave_types defaults, leave_balance for all active staff
 */

import db from '../config/db.js';

export async function rebuildLeaveSystem() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    console.log('🗑️  Dropping old leave tables...');
    await client.query('DROP TABLE IF EXISTS substitute_schedule CASCADE');
    await client.query('DROP TABLE IF EXISTS staff_leave CASCADE');
    await client.query('DROP TABLE IF EXISTS leave_type CASCADE');
    await client.query('DROP TABLE IF EXISTS leave_balance CASCADE');
    console.log('✅ Old tables dropped.');

    // ──────────────────────────────────────────────────
    // 1. leave_types
    // ──────────────────────────────────────────────────
    console.log('📋 Creating leave_types...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id                SERIAL PRIMARY KEY,
        name              VARCHAR(60) UNIQUE NOT NULL,
        max_days_per_year INTEGER      NOT NULL DEFAULT 12,
        is_paid           BOOLEAN      NOT NULL DEFAULT true,
        requires_document BOOLEAN      NOT NULL DEFAULT false,
        created_at        TIMESTAMPTZ  DEFAULT now()
      )
    `);

    await client.query(`
      INSERT INTO leave_types (name, max_days_per_year, is_paid, requires_document)
      VALUES
        ('Casual Leave',     12,  true,  false),
        ('Sick Leave',       10,  true,  false),
        ('Earned Leave',     15,  true,  false),
        ('Emergency Leave',   3,  true,  false),
        ('Half Day',          6,  true,  false),
        ('Loss of Pay',     999,  false, false)
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ leave_types created & seeded.');

    // ──────────────────────────────────────────────────
    // 2. leave_balance
    // ──────────────────────────────────────────────────
    console.log('💰 Creating leave_balance...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_balance (
        id             SERIAL PRIMARY KEY,
        teacher_id     INTEGER       NOT NULL REFERENCES staff(staff_id)      ON DELETE CASCADE,
        leave_type_id  INTEGER       NOT NULL REFERENCES leave_types(id)      ON DELETE CASCADE,
        academic_year  VARCHAR(9)    NOT NULL,
        total_days     DECIMAL(5,1)  NOT NULL DEFAULT 0,
        used_days      DECIMAL(5,1)  NOT NULL DEFAULT 0,
        remaining_days DECIMAL(5,1)  NOT NULL DEFAULT 0,
        updated_at     TIMESTAMPTZ   DEFAULT now(),
        UNIQUE(teacher_id, leave_type_id, academic_year)
      )
    `);
    console.log('✅ leave_balance created.');

    // ──────────────────────────────────────────────────
    // 3. leave_applications
    // ──────────────────────────────────────────────────
    console.log('📝 Creating leave_applications...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_applications (
        id                  SERIAL PRIMARY KEY,
        teacher_id          INTEGER       NOT NULL REFERENCES staff(staff_id),
        leave_type_id       INTEGER       NOT NULL REFERENCES leave_types(id),
        from_date           DATE          NOT NULL,
        to_date             DATE          NOT NULL,
        total_days          DECIMAL(5,1)  NOT NULL,
        reason              TEXT,
        document_url        TEXT,
        status              VARCHAR(20)   NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','approved','rejected','cancelled')),
        applied_at          TIMESTAMPTZ   DEFAULT now(),
        actioned_by_user_id INTEGER       REFERENCES "user"(user_id),
        actioned_at         TIMESTAMPTZ,
        admin_remarks       TEXT
      )
    `);
    console.log('✅ leave_applications created.');

    // ──────────────────────────────────────────────────
    // 4. substitute_assignments
    // ──────────────────────────────────────────────────
    console.log('🔄 Creating substitute_assignments...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS substitute_assignments (
        id                    SERIAL PRIMARY KEY,
        leave_application_id  INTEGER     NOT NULL REFERENCES leave_applications(id) ON DELETE CASCADE,
        original_teacher_id   INTEGER     NOT NULL REFERENCES staff(staff_id),
        substitute_teacher_id INTEGER     NOT NULL REFERENCES staff(staff_id),
        assignment_date       DATE        NOT NULL,
        period_number         SMALLINT    NOT NULL,
        period_start_time     TIME        NOT NULL,
        period_end_time       TIME        NOT NULL,
        class_id              INTEGER     REFERENCES class(class_id),
        subject               VARCHAR(120),
        room                  VARCHAR(60),
        status                VARCHAR(25) NOT NULL DEFAULT 'pending_acceptance'
                              CHECK (status IN ('pending_acceptance','accepted','declined')),
        created_at            TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ substitute_assignments created.');

    // ──────────────────────────────────────────────────
    // 5. Enhance notifications table
    // ──────────────────────────────────────────────────
    console.log('🔔 Enhancing notifications table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id  SERIAL PRIMARY KEY,
        user_id          INTEGER     NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
        sender_user_id   INTEGER     REFERENCES "user"(user_id),
        related_leave_id INTEGER     REFERENCES leave_applications(id),
        title            VARCHAR(255) NOT NULL,
        message          TEXT        NOT NULL,
        type             VARCHAR(60),
        action_payload   JSONB,
        is_read          BOOLEAN     DEFAULT false,
        created_at       TIMESTAMPTZ DEFAULT now()
      )
    `);
    // Add new columns if the table already exists without them
    await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_user_id   INTEGER REFERENCES "user"(user_id)`);
    await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_leave_id INTEGER REFERENCES leave_applications(id)`);
    await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_payload   JSONB`);
    console.log('✅ notifications table enhanced.');

    // ──────────────────────────────────────────────────
    // 6. Seed leave_balance for ALL active staff (2025-2026)
    // ──────────────────────────────────────────────────
    console.log('🌱 Seeding leave balances for active staff...');
    const { rows: staffRows } = await client.query(
      `SELECT staff_id FROM staff WHERE user_status_id = 1`
    );
    const { rows: typeRows } = await client.query(`SELECT id, name, max_days_per_year FROM leave_types`);
    const academicYear = '2025-2026';

    for (const staff of staffRows) {
      for (const lt of typeRows) {
        const maxDays = lt.name === 'Loss of Pay' ? 999 : lt.max_days_per_year;
        await client.query(`
          INSERT INTO leave_balance (teacher_id, leave_type_id, academic_year, total_days, used_days, remaining_days)
          VALUES ($1, $2, $3, $4, 0, $4)
          ON CONFLICT (teacher_id, leave_type_id, academic_year) DO NOTHING
        `, [staff.staff_id, lt.id, academicYear, maxDays]);
      }
    }
    console.log(`✅ Seeded balances for ${staffRows.length} staff members.`);

    await client.query('COMMIT');
    console.log('');
    console.log('✅✅✅ Leave Management System Rebuild — Migration Successful! ✅✅✅');
    console.log('');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration Failed:', err.message);
    console.error(err);
    throw err;
  } finally {
    client.release();
  }
}

// Run if called directly: node src/migrations/20260417_leave_rebuild.js
const isMain = process.argv[1] && process.argv[1].includes('20260417_leave_rebuild');
if (isMain) {
  rebuildLeaveSystem()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
