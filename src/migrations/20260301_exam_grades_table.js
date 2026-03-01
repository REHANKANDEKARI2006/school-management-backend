// src/migrations/20260301_exam_grades_table.js
import db from '../config/db.js';

export async function createExamGradesTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS exam_grades (
        grade_id        SERIAL PRIMARY KEY,
        exam_id         INTEGER NOT NULL,
        student_id      INTEGER NOT NULL,
        marks_obtained  DOUBLE PRECISION NOT NULL,
        grade           VARCHAR(10),
        created_at      TIMESTAMPTZ DEFAULT now(),
        updated_at      TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT exam_grades_exam_id_fkey
          FOREIGN KEY (exam_id) REFERENCES public.exam(exam_id) ON DELETE CASCADE,
        CONSTRAINT exam_grades_student_id_fkey
          FOREIGN KEY (student_id) REFERENCES public.student(student_id) ON DELETE CASCADE,
        CONSTRAINT exam_grades_exam_student_unique
          UNIQUE (exam_id, student_id)
      )
    `);
    console.log('exam_grades table ensured.');
  } catch (error) {
    console.error('createExamGradesTable error:', error);
    throw error;
  }
}

export async function dropExamGradesTable() {
  try {
    await db.query('DROP TABLE IF EXISTS exam_grades CASCADE');
    console.log('exam_grades table dropped.');
  } catch (error) {
    console.error('dropExamGradesTable error:', error);
  }
}
