// src/migrations/20260111_exam_table_update.js
import db from '../config/db.js';

//
// 1. Create exam table
//
export async function createExamTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS exam (
        exam_id        SERIAL PRIMARY KEY,
        exam_name      VARCHAR(255) NOT NULL,
        exam_type_id   INTEGER NOT NULL,          -- FK to exam_type
        class_id       INTEGER NOT NULL,          -- FK to class (1..30)
        subject_id     INTEGER NOT NULL,          -- FK to subject
        date_time      TIMESTAMPTZ,
        duration_mins  INTEGER,
        total_score    DOUBLE PRECISION,
        min_marks      DOUBLE PRECISION,
        max_marks      DOUBLE PRECISION,
        exam_status_id INTEGER NOT NULL,          -- New status column
        created_at     TIMESTAMPTZ DEFAULT now(),
        updated_at     TIMESTAMPTZ DEFAULT now(),

        CONSTRAINT exam_exam_type_id_fkey
          FOREIGN KEY (exam_type_id) REFERENCES public.exam_type(exam_type_id),
        CONSTRAINT exam_subject_id_fkey
          FOREIGN KEY (subject_id) REFERENCES public.subject(subject_id),
        CONSTRAINT exam_status_id_fkey
          FOREIGN KEY (exam_status_id) REFERENCES public.exam_status(exam_status_id),
        CONSTRAINT exam_class_id_fkey
          FOREIGN KEY (class_id) REFERENCES public.class(class_id)
      )
    `);
    console.log('exam table ensured with exam_status_id.');
  } catch (error) {
    console.error('createExamTable error:', error);
  }
}

//
// 2. Drop exam table
//
export async function dropExamTable() {
  try {
    await db.query('DROP TABLE IF EXISTS exam CASCADE');
    console.log('exam table dropped.');
  } catch (error) {
    console.error('dropExamTable error:', error);
  }
}

//
// 3. Seed exams for all 30 classes with fixed dates
//
export async function seedGeneralExams() {
  try {
    // 1. Fetch 'Upcoming' status ID dynamically
    const statusRes = await db.query(
      `SELECT exam_status_id FROM exam_status WHERE exam_status_name = 'Upcoming'`
    );
    if (statusRes.rows.length === 0) {
      throw new Error("Status 'Upcoming' not found. Please seed exam_status table first.");
    }
    const UPCOMING_STATUS_ID = statusRes.rows[0].exam_status_id;

    // Adjust these subject_ids to match your actual subjects
    const subjectsCore = [1, 2, 3, 4]; // e.g. English, Hindi, Maths, Science

    // exam_type_id mapping
    const WR_UNIT = 1;
    const WR_TERM = 2;
    const WR_FINAL = 3;
    const PR_UNIT = 4;
    const PR_TERM = 5;
    const PR_FINAL = 6;
    const OR_UNIT = 7;
    const OR_TERM = 8;
    const OR_FINAL = 9;
    const INTERNAL = 10;
    const VIVA = 11;

    const row = (examName, examTypeId, classId, subjectId,
      dateStr, duration, total, min, max, statusId = UPCOMING_STATUS_ID) =>
      `('${examName}', ${examTypeId}, ${classId}, ${subjectId},
        '${dateStr}', ${duration}, ${total}, ${min}, ${max},
        ${statusId}, now(), now())`;

    const values = [];
    const dt = (dateStr) => `${dateStr} 09:00:00+05:30`;

    for (let classNum = 1; classNum <= 10; classNum++) {
      for (let secIndex = 0; secIndex < 3; secIndex++) {
        // class_id is fixed: 1..30 as in your screenshot
        const classId = 30 + (classNum - 1) * 3 + (secIndex + 1);

        // Marks scheme
        let unitTotal, unitPass, termTotal, termPass, finalTotal, finalPass;
        if (classNum <= 5) {
          unitTotal = 40; unitPass = 14;
          termTotal = 60; termPass = 21;
          finalTotal = 80; finalPass = 28;
        } else if (classNum <= 8) {
          unitTotal = 50; unitPass = 17;
          termTotal = 80; termPass = 28;
          finalTotal = 100; finalPass = 35;
        } else {
          unitTotal = 50; unitPass = 17;
          termTotal = 80; termPass = 28;
          finalTotal = 100; finalPass = 35;
        }

        const oralTotal = classNum <= 5 ? 20 : 25;
        const oralPass = classNum <= 5 ? 7 : 9;

        subjectsCore.forEach((subId) => {
          // Written exams
          values.push(row(`Unit Test 1 - Class ${classNum}`, WR_UNIT, classId, subId, dt('2026-08-10'), 60, unitTotal, unitPass, unitTotal));
          values.push(row(`Unit Test 2 - Class ${classNum}`, WR_UNIT, classId, subId, dt('2026-09-15'), 60, unitTotal, unitPass, unitTotal));
          values.push(row(`Term Exam (Written) - Class ${classNum}`, WR_TERM, classId, subId, dt('2026-11-25'), classNum <= 5 ? 90 : 120, termTotal, termPass, termTotal));
          values.push(row(`Final Exam (Written) - Class ${classNum}`, WR_FINAL, classId, subId, dt('2027-03-10'), classNum <= 5 ? 120 : 180, finalTotal, finalPass, finalTotal));

          // Practical / internal for classes 6–10
          if (classNum >= 6) {
            values.push(row(`Unit Practical - Class ${classNum}`, PR_UNIT, classId, subId, dt('2026-10-05'), 60, 30, 10, 30));
            values.push(row(`Term Practical - Class ${classNum}`, PR_TERM, classId, subId, dt('2026-12-10'), 90, 40, 14, 40));
            values.push(row(`Final Practical - Class ${classNum}`, PR_FINAL, classId, subId, dt('2027-02-15'), 90, 50, 17, 50));
            values.push(row(`Internal Assessment - Class ${classNum}`, INTERNAL, classId, subId, dt('2026-09-30'), 45, 20, 7, 20));
          }

          // Orals for all
          values.push(row(`Oral Unit Test - Class ${classNum}`, OR_UNIT, classId, subId, dt('2026-08-25'), 20, oralTotal, oralPass, oralTotal));
          values.push(row(`Oral Term Exam - Class ${classNum}`, OR_TERM, classId, subId, dt('2026-12-01'), 30, oralTotal, oralPass, oralTotal));
          values.push(row(`Oral Final Exam - Class ${classNum}`, OR_FINAL, classId, subId, dt('2027-03-20'), 30, oralTotal, oralPass, oralTotal));

          // Viva for 9th and 10th
          if (classNum >= 9) {
            values.push(row(`Viva Voce - Class ${classNum}`, VIVA, classId, subId, dt('2027-02-25'), 30, 20, 7, 20));
          }
        });
      }
    }

    await db.query(`
      INSERT INTO exam (
        exam_name,
        exam_type_id,
        class_id,
        subject_id,
        date_time,
        duration_mins,
        total_score,
        min_marks,
        max_marks,
        exam_status_id,
        created_at,
        updated_at
      )
      VALUES
        ${values.join(',\n')}
    `);

    console.log('general exams seeded with Upcoming status.');
  } catch (error) {
    console.error('seedGeneralExams error:', error);
  }
}

//
// 4. delete all exam rows
//
export async function deleteAllExams() {
  try {
    await db.query('DELETE FROM exam');
    console.log('all exams deleted.');
  } catch (error) {
    console.error('deleteAllExams error:', error);
  }
}

// Uncomment ONE at a time when running this file:
// createExamTable();
// dropExamTable();
seedGeneralExams();
// deleteAllExams();