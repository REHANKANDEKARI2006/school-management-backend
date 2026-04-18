// src/migrations/20260418_event_enhancement.js
// Event Module Enhancement — Database Migration
// Adds: event_type, multi-day support, start/end time, displaced period handling
// Creates: event_class_assignments, event_period_exchanges, event_attendance

import db from '../config/db.js';

/**
 * 1. ALTER events table — add new columns for enhanced events
 */
export async function alterEventsTable() {
  try {
    // Add event_type column
    await db.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT 'School Event'
    `);

    // Add multi-day date support
    await db.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS event_start_date DATE,
      ADD COLUMN IF NOT EXISTS event_end_date DATE
    `);

    // Add time columns
    await db.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS start_time TIME,
      ADD COLUMN IF NOT EXISTS end_time TIME
    `);

    // Add displaced period action
    await db.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS displaced_period_action VARCHAR(20) DEFAULT 'cancel'
    `);

    // Backfill event_start_date and event_end_date from existing event_date
    await db.query(`
      UPDATE events
      SET event_start_date = event_date,
          event_end_date = event_date
      WHERE event_start_date IS NULL AND event_date IS NOT NULL
    `);

    console.log('✅ events table altered with new columns.');
  } catch (error) {
    console.error('alterEventsTable error:', error);
  }
}

/**
 * 2. CREATE event_class_assignments table
 */
export async function createEventClassAssignmentsTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS event_class_assignments (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
        class_id INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        coordinator_teacher_id INTEGER REFERENCES staff(staff_id),
        attendance_status VARCHAR(20) DEFAULT 'not_started',
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(event_id, class_id)
      )
    `);
    console.log('✅ event_class_assignments table created.');
  } catch (error) {
    console.error('createEventClassAssignmentsTable error:', error);
  }
}

/**
 * 3. CREATE event_period_exchanges table
 */
export async function createEventPeriodExchangesTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS event_period_exchanges (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
        class_id INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        original_period_number INTEGER NOT NULL,
        original_teacher_id INTEGER REFERENCES staff(staff_id),
        original_subject VARCHAR(100),
        exchange_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'exchanged',
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('✅ event_period_exchanges table created.');
  } catch (error) {
    console.error('createEventPeriodExchangesTable error:', error);
  }
}

/**
 * 4. CREATE event_attendance table
 */
export async function createEventAttendanceTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS event_attendance (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
        class_id INTEGER NOT NULL REFERENCES class(class_id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES student(student_id),
        status VARCHAR(10) NOT NULL DEFAULT 'present',
        remarks TEXT,
        marked_by INTEGER REFERENCES staff(staff_id),
        marked_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(event_id, class_id, student_id)
      )
    `);
    console.log('✅ event_attendance table created.');
  } catch (error) {
    console.error('createEventAttendanceTable error:', error);
  }
}

/**
 * Run all migrations
 */
export async function runAll() {
  await alterEventsTable();
  await createEventClassAssignmentsTable();
  await createEventPeriodExchangesTable();
  await createEventAttendanceTable();
  console.log('✅ All event enhancement migrations completed.');
  process.exit(0);
}

runAll();
