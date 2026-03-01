// src/migrations/20251912_attendance_session_table.js
import db from '../config/db.js';

//
// 1. Create attendance_status table
//
export async function createAttendanceStatusTable() {
    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS attendance_status (
        status_id   SERIAL PRIMARY KEY,
        status_name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        created_at  TIMESTAMPTZ DEFAULT now(),
        updated_at  TIMESTAMPTZ DEFAULT now()
      );
    `);
        console.log('attendance_status table ensured.');
    } catch (err) {
        console.error('createAttendanceStatusTable error:', err);
    }
}

//
// 2. Seed attendance statuses
//
export async function seedAttendanceStatus() {
    try {
        const statuses = [
            { id: 1, name: 'Present', desc: 'Student is present in the class.' },
            { id: 2, name: 'Absent', desc: 'Student is absent from the class.' },
            { id: 3, name: 'Late', desc: 'Student arrived late to the class.' },
            { id: 4, name: 'Half Day', desc: 'Student attended only half of the session.' },
            { id: 5, name: 'On Leave', desc: 'Student is on an approved leave.' }
        ];

        for (const s of statuses) {
            await db.query(
                `INSERT INTO attendance_status (status_id, status_name, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (status_id) DO UPDATE SET status_name = EXCLUDED.status_name, description = EXCLUDED.description`,
                [s.id, s.name, s.desc]
            );
        }
        console.log('attendance_status table seeded.');
    } catch (err) {
        console.error('seedAttendanceStatus error:', err);
    }
}

//
// 3. Create attendance_session table
//
export async function createAttendanceSessionTable() {
    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS attendance_session (
        session_id      SERIAL PRIMARY KEY,
        class_id        INTEGER NOT NULL,
        section_id      INTEGER NOT NULL,
        subject_id      INTEGER NOT NULL,
        faculty_id      INTEGER,
        attendance_date DATE NOT NULL,
        created_by      INTEGER,
        created_at      TIMESTAMPTZ DEFAULT now(),
        updated_at      TIMESTAMPTZ DEFAULT now(),

        CONSTRAINT attendance_session_class_fkey
          FOREIGN KEY (class_id) REFERENCES public.class(class_id),
        CONSTRAINT attendance_session_section_fkey
          FOREIGN KEY (section_id) REFERENCES public.section(section_id),
        CONSTRAINT attendance_session_subject_fkey
          FOREIGN KEY (subject_id) REFERENCES public.subject(subject_id),
        CONSTRAINT attendance_session_faculty_fkey
          FOREIGN KEY (faculty_id) REFERENCES public.staff(staff_id)
      );
    `);
        console.log('attendance_session table ensured.');
    } catch (err) {
        console.error('createAttendanceSessionTable error:', err);
    }
}

//
// 4. Drop tables (Careful!)
//
export async function dropAttendanceTables() {
    try {
        await db.query('DROP TABLE IF EXISTS attendance_session CASCADE');
        await db.query('DROP TABLE IF EXISTS attendance_status CASCADE');
        console.log('Attendance tables dropped.');
    } catch (err) {
        console.error('dropAttendanceTables error:', err);
    }
}

// Execution block
async function runMigration() {
    await createAttendanceStatusTable();
    await seedAttendanceStatus();
    await createAttendanceSessionTable();
}

runMigration();
