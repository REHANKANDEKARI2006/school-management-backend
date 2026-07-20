import db from '../config/db.js';

async function fixSchema() {
  const client = await db.connect();
  try {
    // ═══════════════════════════════════════════════
    // 1. Add is_break column to schedule table
    // ═══════════════════════════════════════════════
    console.log('🔧 Adding is_break to schedule...');
    await client.query('ALTER TABLE schedule ADD COLUMN IF NOT EXISTS is_break BOOLEAN DEFAULT FALSE');
    console.log('✅ schedule.is_break added.');

    // ═══════════════════════════════════════════════
    // 2. Create activity_log table
    // ═══════════════════════════════════════════════
    console.log('🔧 Creating activity_log table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER REFERENCES "user"(user_id) ON DELETE SET NULL,
        action_type    VARCHAR(20) NOT NULL,
        description    TEXT,
        institute_id   INTEGER REFERENCES institute(institute_id) ON DELETE SET NULL,
        created_at     TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ activity_log table created.');

    // ═══════════════════════════════════════════════
    // 3. Create substitute_assignments table
    // ═══════════════════════════════════════════════
    console.log('🔧 Creating substitute_assignments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS substitute_assignments (
        id                      SERIAL PRIMARY KEY,
        class_id                INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        period_number           SMALLINT NOT NULL,
        assignment_date         DATE NOT NULL,
        original_teacher_id     INTEGER REFERENCES staff(staff_id) ON DELETE SET NULL,
        substitute_teacher_id   INTEGER REFERENCES staff(staff_id) ON DELETE SET NULL,
        subject_id              INTEGER REFERENCES subject(subject_id) ON DELETE SET NULL,
        status                  VARCHAR(20) DEFAULT 'pending',
        reason                  TEXT,
        created_at              TIMESTAMPTZ DEFAULT now(),
        updated_at              TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ substitute_assignments table created.');

    // ═══════════════════════════════════════════════
    // 4. Create leave_applications table (used by staff attendance)
    // ═══════════════════════════════════════════════
    console.log('🔧 Creating leave_applications table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_applications (
        id             SERIAL PRIMARY KEY,
        teacher_id     INTEGER NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
        leave_type     VARCHAR(50),
        from_date      DATE NOT NULL,
        to_date        DATE NOT NULL,
        reason         TEXT,
        status         VARCHAR(20) DEFAULT 'pending',
        approved_by    INTEGER REFERENCES "user"(user_id) ON DELETE SET NULL,
        created_at     TIMESTAMPTZ DEFAULT now(),
        updated_at     TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ leave_applications table created.');

    // ═══════════════════════════════════════════════
    // 5. Add staff_id to attendance_record (for staff attendance tracking)
    // ═══════════════════════════════════════════════
    console.log('🔧 Adding staff_id to attendance_record...');
    await client.query('ALTER TABLE attendance_record ADD COLUMN IF NOT EXISTS staff_id INTEGER REFERENCES staff(staff_id)');
    console.log('✅ attendance_record.staff_id added.');

    // ═══════════════════════════════════════════════
    // 6. Add venue to events table
    // ═══════════════════════════════════════════════
    console.log('🔧 Adding venue to events table...');
    await client.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS venue VARCHAR(200)');
    await client.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT');
    await client.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS event_start_date DATE');
    await client.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS event_end_date DATE');
    // Sync event_start_date and event_end_date with event_date if null
    await client.query(`UPDATE events SET event_start_date = event_date WHERE event_start_date IS NULL`);
    await client.query(`UPDATE events SET event_end_date = event_date WHERE event_end_date IS NULL`);
    console.log('✅ events columns added.');

    console.log('\n=============================================');
    console.log('🎉 ALL SCHEMA FIXES APPLIED SUCCESSFULLY! 🎉');
    console.log('=============================================');
  } catch (err) {
    console.error('❌ Schema fix error:', err);
  } finally {
    client.release();
    await db.end();
    process.exit(0);
  }
}

fixSchema();
