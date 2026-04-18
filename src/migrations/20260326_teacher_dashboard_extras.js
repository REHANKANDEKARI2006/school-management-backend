// src/migrations/20260326_teacher_dashboard_extras.js
import db from '../config/db.js';

export async function createTeacherDashboardTables() {
  try {
    await db.query(`
      -- Staff Leave Table
      CREATE TABLE IF NOT EXISTS staff_leave (
        leave_id    SERIAL PRIMARY KEY,
        staff_id    INTEGER NOT NULL,
        start_date  DATE NOT NULL,
        end_date    DATE NOT NULL,
        reason      TEXT,
        status_id   INTEGER DEFAULT 1, -- 1: Pending, 2: Approved, 3: Rejected
        created_at  TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT staff_leave_staff_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id)
      );

      -- Substitute Schedule Table
      CREATE TABLE IF NOT EXISTS substitute_schedule (
        sub_id              SERIAL PRIMARY KEY,
        original_staff_id   INTEGER NOT NULL,
        substitute_staff_id INTEGER NOT NULL,
        schedule_id         INTEGER NOT NULL,
        sub_date            DATE NOT NULL,
        created_at          TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT sub_orig_staff_fkey FOREIGN KEY (original_staff_id) REFERENCES public.staff(staff_id),
        CONSTRAINT sub_sub_staff_fkey FOREIGN KEY (substitute_staff_id) REFERENCES public.staff(staff_id),
        CONSTRAINT sub_schedule_fkey FOREIGN KEY (schedule_id) REFERENCES public.schedule(schedule_id)
      );

      -- Teacher Messages Table
      CREATE TABLE IF NOT EXISTS teacher_messages (
        message_id  SERIAL PRIMARY KEY,
        sender_id   INTEGER NOT NULL, -- Student User ID or Student ID
        receiver_id INTEGER NOT NULL, -- Staff ID
        content     TEXT NOT NULL,
        is_read     BOOLEAN DEFAULT false,
        created_at  TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT msg_receiver_fkey FOREIGN KEY (receiver_id) REFERENCES public.staff(staff_id)
      );

      -- Teacher Requests Table
      CREATE TABLE IF NOT EXISTS teacher_requests (
        request_id   SERIAL PRIMARY KEY,
        student_id   INTEGER NOT NULL,
        teacher_id   INTEGER NOT NULL,
        request_type VARCHAR(50) NOT NULL, -- e.g., 'Correction', 'Meeting', 'Material'
        description  TEXT,
        status_id    INTEGER DEFAULT 1, -- 1: Pending, 2: Resolved, 3: Declined
        created_at   TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT req_student_fkey FOREIGN KEY (student_id) REFERENCES public.student(student_id),
        CONSTRAINT req_teacher_fkey FOREIGN KEY (teacher_id) REFERENCES public.staff(staff_id)
      );

      -- Student Submissions Table
      CREATE TABLE IF NOT EXISTS student_submissions (
        submission_id SERIAL PRIMARY KEY,
        material_id   INTEGER NOT NULL,
        student_id    INTEGER NOT NULL,
        file_path     VARCHAR(255),
        submitted_at  TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT sub_material_fkey FOREIGN KEY (material_id) REFERENCES public.materials(material_id),
        CONSTRAINT sub_student_fkey FOREIGN KEY (student_id) REFERENCES public.student(student_id)
      );
    `);
    console.log('Teacher dashboard extra tables ensured.');
  } catch (error) {
    console.error('createTeacherDashboardTables error:', error);
  }
}

export async function seedTeacherDashboardExtras() {
  try {
    // Seed some example data for staff_id 76 (Ramsha Khan) who is a teacher
    const staffId = 76;
    const studentId = 243; 

    // Find a material for this teacher's subject
    const matRes = await db.query("SELECT material_id FROM materials LIMIT 1");
    const materialId = matRes.rows[0]?.material_id;

    await db.query(`
      INSERT INTO staff_leave (staff_id, start_date, end_date, reason, status_id)
      VALUES ($1, CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '6 days', 'Personal work', 2)
      ON CONFLICT DO NOTHING;

      INSERT INTO substitute_schedule (original_staff_id, substitute_staff_id, schedule_id, sub_date)
      VALUES (75, $1, 1, CURRENT_DATE) 
      ON CONFLICT DO NOTHING;

      INSERT INTO teacher_messages (sender_id, receiver_id, content, is_read)
      VALUES ($2, $1, 'Mam, I have a doubt in Chapter 3.', false),
             ($2, $1, 'When is the next assignment due?', true)
      ON CONFLICT DO NOTHING;

      INSERT INTO teacher_requests (student_id, teacher_id, request_type, description, status_id)
      VALUES ($2, $1, 'Correction', 'Request for marks correction in unit test.', 1)
      ON CONFLICT DO NOTHING;
    `, [staffId, studentId]);

    if (materialId) {
       await db.query(`
          INSERT INTO student_submissions (material_id, student_id, submitted_at)
          VALUES ($1, $2, now())
          ON CONFLICT DO NOTHING;
       `, [materialId, studentId]);
    }

    console.log('Teacher dashboard extra data seeded.');
  } catch (error) {
    console.error('seedTeacherDashboardExtras error:', error);
  }
}

// Run if called directly
// createTeacherDashboardTables().then(() => seedTeacherDashboardExtras());
