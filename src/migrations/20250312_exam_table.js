// src/migrations/20251203_exam_table.js
import db from '../config/db.js';

// ---------- 1. create exam table ----------
export async function createExamTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS exam (
        exam_id      SERIAL PRIMARY KEY,
        exam_name    VARCHAR(255) NOT NULL,
        class_id     INTEGER,
        subject_id   INTEGER,
        date_time    TIMESTAMP,
        duration_mins INTEGER,
        total_score  DOUBLE PRECISION,
        min_marks    DOUBLE PRECISION,
        max_marks    DOUBLE PRECISION,
        status_id    INTEGER,
        CONSTRAINT exam_subject_id_fkey
          FOREIGN KEY (subject_id) REFERENCES public.subject(subject_id),
        CONSTRAINT exam_status_id_fkey
          FOREIGN KEY (status_id) REFERENCES public.status(status_id)
      )
    `);
    console.log('exam table ensured.');
  } catch (error) {
    console.error('createExamTable error:', error);
  }
}

// ---------- 2. drop exam table (optional) ----------
export async function dropExamTable() {
  try {
    await db.query('DROP TABLE IF EXISTS exam CASCADE');
    console.log('exam table dropped.');
  } catch (error) {
    console.error('dropExamTable error:', error);
  }
}

// ---------- 3. seed general exam templates ----------
export async function seedGeneralExams() {
  try {
    // These are generic templates; you can later filter by class_id or set it NULL for global
    const values = [
      // exam_name, class_id, subject_id, date_time, duration_mins, total_score, min_marks, max_marks, status_id
      `('Unit Test 1',      NULL, NULL, NULL, 60, 100, 35, 100, 1)`,
      `('Unit Test 2',      NULL, NULL, NULL, 60, 100, 35, 100, 1)`,
      `('Mid-Term Written', NULL, NULL, NULL, 180, 100, 35, 100, 1)`,
      `('Final Written',    NULL, NULL, NULL, 180, 100, 35, 100, 1)`,
      `('Unit Test 1 Practical',  NULL, NULL, NULL, 90,  50, 17,  50, 1)`,
      `('Unit Test 2 Practical',  NULL, NULL, NULL, 90,  50, 17,  50, 1)`,
      `('Mid-Term Practical',     NULL, NULL, NULL, 120, 50, 17,  50, 1)`,
      `('Final Practical',        NULL, NULL, NULL, 120, 50, 17,  50, 1)`,
      `('Unit Test 1 Oral',       NULL, NULL, NULL, 30,  20,  7,  20, 1)`,
      `('Unit Test 2 Oral',       NULL, NULL, NULL, 30,  20,  7,  20, 1)`,
      `('Mid-Term Oral',          NULL, NULL, NULL, 45,  20,  7,  20, 1)`,
      `('Final Oral',             NULL, NULL, NULL, 45,  20,  7,  20, 1)`
    ];

    await db.query(`
      INSERT INTO exam (
        exam_name,
        class_id,
        subject_id,
        date_time,
        duration_mins,
        total_score,
        min_marks,
        max_marks,
        status_id
      )
      VALUES
        ${values.join(',\n')}
    `);

    console.log('general exams seeded.');
  } catch (error) {
    console.error('seedGeneralExams error:', error);
  }
}

// ---------- 4. delete all exam rows (optional) ----------
export async function deleteAllExams() {
  try {
    await db.query('DELETE FROM exam');
    console.log('all exams deleted.');
  } catch (error) {
    console.error('deleteAllExams error:', error);
  }
}

// Uncomment ONE at a time to run directly:
// createExamTable();
// dropExamTable();
seedGeneralExams();
// deleteAllExams();
