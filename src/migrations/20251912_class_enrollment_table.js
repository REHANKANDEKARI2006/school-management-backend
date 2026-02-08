// src/migrations/20251219_class_enrollment_table.js
import db from '../config/db.js';

//
// 1. Create class_enrollment table
//
export async function createClassEnrollmentTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS class_enrollment (
        enrollment_id SERIAL PRIMARY KEY,
        class_id      INTEGER NOT NULL,
        student_id    INTEGER NOT NULL,
        enrolled_date TIMESTAMPTZ DEFAULT now(),
        status_id     INTEGER,
        created_at    TIMESTAMPTZ DEFAULT now(),
        updated_at    TIMESTAMPTZ DEFAULT now(),

        CONSTRAINT class_enrollment_class_fkey
          FOREIGN KEY (class_id) REFERENCES public.class(class_id),
        CONSTRAINT class_enrollment_student_fkey
          FOREIGN KEY (student_id) REFERENCES public.student(student_id),
        CONSTRAINT class_enrollment_status_fkey
          FOREIGN KEY (status_id) REFERENCES public.status(status_id)
      )
    `);
    console.log('class_enrollment table ensured.');
  } catch (err) {
    console.error('createClassEnrollmentTable error:', err);
  }
}

//
// 2. Seed enrollments: 20 students per class
//    - assumes exactly 30 classes to use
//    - uses student_id 3..602 (600 students total)
//
export async function seedClassEnrollment() {
  try {
    await db.query('BEGIN');
    await db.query('DELETE FROM class_enrollment');

    // Adjust this to the actual 30 class_ids that represent
    // Class 1A, 1B, 1C, ..., 10C in your class table.
    // Example: 31..60
    const classIds = [];
    for (let id = 31; id <= 60; id++) {
      classIds.push(id);
    }

    const STUDENTS_PER_CLASS = 20;
    const FIRST_STUDENT_ID = 3;
    const LAST_STUDENT_ID  = 602;

    let currentStudentId = FIRST_STUDENT_ID;

    for (const classId of classIds) {
      for (let i = 0; i < STUDENTS_PER_CLASS; i++) {
        if (currentStudentId > LAST_STUDENT_ID) {
          throw new Error('Not enough students to fill all classes');
        }

        await db.query(
          `
          INSERT INTO class_enrollment (
            class_id,
            student_id,
            enrolled_date,
            status_id
          )
          VALUES ($1,$2, now(), $3)
          `,
          [classId, currentStudentId, 1]  // status_id = 1 (Active)
        );

        currentStudentId++;
      }
    }

    await db.query('COMMIT');
    console.log('seedClassEnrollment: 600 rows inserted (20 per class).');
  } catch (err) {
    console.error('seedClassEnrollment error:', err);
    await db.query('ROLLBACK');
  }
}

//
// 3. Clear all enrollments
//
export async function clearClassEnrollment() {
  try {
    await db.query('DELETE FROM class_enrollment');
    console.log('all class_enrollment rows deleted.');
  } catch (err) {
    console.error('clearClassEnrollment error:', err);
  }
}

//
// 4. Drop class_enrollment table
//
export async function dropClassEnrollmentTable() {
  try {
    await db.query('DROP TABLE IF EXISTS class_enrollment CASCADE');
    console.log('class_enrollment table dropped.');
  } catch (err) {
    console.error('dropClassEnrollmentTable error:', err);
  }
}


// Run one at a time, e.g.:
// createClassEnrollmentTable();
seedClassEnrollment();
// clearClassEnrollment();
// dropClassEnrollmentTable();
