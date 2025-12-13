// src/migrations/20250212_class_enrollment_table.js
import db from '../config/db.js';

//
// 1. Create class_section table (class + section mapping)
//
export async function createClassSectionTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS class_section (
        class_section_id SERIAL PRIMARY KEY,
        class_id         INTEGER NOT NULL,
        section_id       INTEGER NOT NULL,
        CONSTRAINT class_section_class_fkey
          FOREIGN KEY (class_id) REFERENCES class(class_id),
        CONSTRAINT class_section_section_fkey
          FOREIGN KEY (section_id) REFERENCES section(section_id),
        CONSTRAINT class_section_unique
          UNIQUE (class_id, section_id)
      )
    `);
    console.log('class_section table ensured.');
  } catch (error) {
    console.error('createClassSectionTable error:', error);
  }
}

//
// 2. Create class_enrollment table (student in a specific class+section)
//
export async function createClassEnrollmentTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS class_enrollment (
        enrollment_id    SERIAL PRIMARY KEY,
        class_section_id INTEGER NOT NULL,
        student_id       INTEGER NOT NULL,
        enrolled_on      DATE    NOT NULL DEFAULT CURRENT_DATE,
        status           VARCHAR(20) NOT NULL DEFAULT 'Active',
        CONSTRAINT class_enrollment_cs_fkey
          FOREIGN KEY (class_section_id) REFERENCES class_section(class_section_id),
        CONSTRAINT class_enrollment_student_fkey
          FOREIGN KEY (student_id) REFERENCES student(student_id),
        CONSTRAINT class_enrollment_unique
          UNIQUE (class_section_id, student_id)
      )
    `);
    console.log('class_enrollment table ensured.');
  } catch (error) {
    console.error('createClassEnrollmentTable error:', error);
  }
}

//
// 3. Enroll a RANGE of students into ONE (class, section) pair
//
export async function enrollStudentRangeToClassAndSection() {
  // >>> CHANGE ONLY THESE CONSTANTS <<<
  const TARGET_CLASS_ID    = 13; // e.g. class_id for "5"
  const TARGET_SECTION_ID  = 1;  // e.g. section_id for "A"
  const START_STUDENT_ID   = 56; // first student_id in the batch
  const END_STUDENT_ID     = 75; // last  student_id in the batch

  try {
    // 1) Ensure there is a class_section row for (class_id, section_id)
    const { rows: csRows } = await db.query(
      `
        INSERT INTO class_section (class_id, section_id)
        VALUES ($1, $2)
        ON CONFLICT (class_id, section_id) DO NOTHING
        RETURNING class_section_id
      `,
      [TARGET_CLASS_ID, TARGET_SECTION_ID]
    );

    let classSectionId;

    if (csRows.length > 0) {
      classSectionId = csRows[0].class_section_id;
    } else {
      // already existed, fetch it
      const { rows } = await db.query(
        `
          SELECT class_section_id
          FROM class_section
          WHERE class_id = $1 AND section_id = $2
        `,
        [TARGET_CLASS_ID, TARGET_SECTION_ID]
      );
      if (rows.length === 0) {
        console.log('No class_section found or created for given class/section.');
        return;
      }
      classSectionId = rows[0].class_section_id;
    }

    // 2) Get students in the requested student_id range
    const { rows: students } = await db.query(
      `
        SELECT student_id
        FROM student
        WHERE student_id BETWEEN $1 AND $2
        ORDER BY student_id
      `,
      [START_STUDENT_ID, END_STUDENT_ID]
    );

    if (students.length === 0) {
      console.log('No students found in given student_id range.');
      return;
    }

    // 3) Build enrollment rows
    const values = students.map(
      s => `(${classSectionId}, ${s.student_id})`
    );

    await db.query(`
      INSERT INTO class_enrollment (class_section_id, student_id)
      VALUES
        ${values.join(',\n')}
      ON CONFLICT (class_section_id, student_id) DO NOTHING
    `);

    console.log(
      `Enrolled ${students.length} students (IDs ${START_STUDENT_ID}–${END_STUDENT_ID}) into class_id ${TARGET_CLASS_ID}, section_id ${TARGET_SECTION_ID}.`
    );
  } catch (error) {
    console.error('enrollStudentRangeToClassAndSection error:', error);
  }
}

//
// 4. Delete all enrollments (optional helper)
//
export async function deleteAllEnrollments() {
  try {
    await db.query('DELETE FROM class_enrollment');
    console.log('all enrollments deleted.');
  } catch (error) {
    console.error('deleteAllEnrollments error:', error);
  }
}

// Uncomment ONE at a time to run directly:
// createClassSectionTable();
// createClassEnrollmentTable();
// enrollStudentRangeToClassAndSection();
// deleteAllEnrollments();

