// src/migrations/20260112_attendance_record_table_fixed.js
import db from '../config/db.js';

//
// 1. Create attendance_record table (unchanged)
//
export async function createAttendanceRecordTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS attendance_record (
        record_id        SERIAL PRIMARY KEY,
        session_id       INTEGER NOT NULL,
        student_id       INTEGER NOT NULL,
        staff_id         INTEGER NOT NULL,
        status_id        INTEGER NOT NULL,
        timestamp        TIMESTAMPTZ DEFAULT now(),
        remarks          TEXT,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now(),

        CONSTRAINT attendance_record_session_fkey
          FOREIGN KEY (session_id) REFERENCES public.attendance_session(session_id) ON DELETE CASCADE,
        CONSTRAINT attendance_record_student_fkey
          FOREIGN KEY (student_id) REFERENCES public.student(student_id),
        CONSTRAINT attendance_record_staff_fkey
          FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id),
        CONSTRAINT attendance_record_status_fkey
          FOREIGN KEY (status_id) REFERENCES public.attendance_status(status_id),

        UNIQUE(session_id, student_id)
      );
    `);
    console.log('attendance_record table ensured.');
  } catch (error) {
    console.error('createAttendanceRecordTable error:', error);
  }
}

//
// 2. Seed Attendance Records for SPECIFIC Sessions (session_id 1 & 8)
// Session 1: Class 5A (43), Subject 1 (English), created_by: 76
// Session 8: Class 6A (46), Subject 1 (English), created_by: 76
//
export async function seedAttendanceRecords() {
  try {
    // Specific sessions to seed
    const targetSessions = [
      { session_id: 1, classId: 43, startStudentId: 243, endStudentId: 262 }, // Class 5A
      { session_id: 8, classId: 46, startStudentId: 303, endStudentId: 322 }  // Class 6A
    ];

    const STAFF_ID = 76; // Fixed staff_id as specified
    let totalRecords = 0;

    for (const session of targetSessions) {
      console.log(`Seeding session ${session.session_id} for Class ${session.classId}...`);
      
      // Generate student range for this class
      const students = [];
      for (let id = session.startStudentId; id <= session.endStudentId; id++) {
        students.push(id);
      }

      // Seed attendance for each student
      for (const studentId of students) {
        // Realistic attendance distribution: 80% Present, 10% Absent, 10% Leave
        const rand = Math.random();
        let statusId = 1; // Present
        let remarks = null;

        if (rand > 0.9) {
          statusId = 5; // On Leave
          remarks = 'Approved Leave';
        } else if (rand > 0.8) {
          statusId = 2; // Absent
          remarks = 'Notified absent';
        }

        await db.query(`
          INSERT INTO attendance_record (
            session_id, student_id, staff_id, status_id, timestamp, remarks
          ) VALUES ($1, $2, $3, $4, now(), $5)
          ON CONFLICT (session_id, student_id) DO NOTHING
        `, [
          session.session_id,
          studentId,
          STAFF_ID,  // Fixed staff_id = 76
          statusId,
          remarks
        ]);
        
        totalRecords++;
      }
    }

    console.log(`✅ Seeded ${totalRecords} records:`);
    console.log(`   - Session 1 (Class 5A): ${20} students (243-262)`);
    console.log(`   - Session 8 (Class 6A): ${20} students (303-322)`);
    console.log(`   Staff ID 76 marked all attendance.`);

  } catch (error) {
    console.error('seedAttendanceRecords error:', error);
  }
}

//
// 3. Clear all attendance records
//
export async function clearAttendanceRecords() {
  try {
    await db.query('DELETE FROM attendance_record');
    console.log('All attendance_record rows deleted.');
  } catch (error) {
    console.error('clearAttendanceRecords error:', error);
  }
}

//
// 4. Drop attendance_record table
//
export async function dropAttendanceRecordTable() {
  try {
    await db.query('DROP TABLE IF EXISTS attendance_record CASCADE');
    console.log('attendance_record table dropped.');
  } catch (error) {
    console.error('dropAttendanceRecordTable error:', error);
  }
}

// Uncomment ONE at a time:
// createAttendanceRecordTable();
seedAttendanceRecords();  // This seeds ONLY session_id 1 & 8
// clearAttendanceRecords();
// dropAttendanceRecordTable();
