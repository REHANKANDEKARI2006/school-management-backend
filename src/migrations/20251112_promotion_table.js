// src/migrations/20251211_promotion_table.js
import db from '../config/db.js';

//
// 1. create promotion table
//
export async function createPromotionTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS promotion (
        promotion_id           SERIAL PRIMARY KEY,
        student_id             INTEGER NOT NULL,
        from_class_section_id  INTEGER NOT NULL,
        to_class_section_id    INTEGER NOT NULL,
        action_type            VARCHAR(20) NOT NULL, -- 'Promote' or 'Demote'
        reason                 VARCHAR(255),
        action_date            DATE NOT NULL DEFAULT CURRENT_DATE,
        performed_by           INTEGER,
        CONSTRAINT promotion_student_fkey
          FOREIGN KEY (student_id) REFERENCES student(student_id),
        CONSTRAINT promotion_from_cs_fkey
          FOREIGN KEY (from_class_section_id) REFERENCES class_section(class_section_id),
        CONSTRAINT promotion_to_cs_fkey
          FOREIGN KEY (to_class_section_id)   REFERENCES class_section(class_section_id)
      )
    `);
    console.log('promotion table ensured.');
  } catch (error) {
    console.error('createPromotionTable error:', error);
  }
}

//
// 2. drop promotion table (optional)
//
export async function dropPromotionTable() {
  try {
    await db.query('DROP TABLE IF EXISTS promotion CASCADE');
    console.log('promotion table dropped.');
  } catch (error) {
    console.error('dropPromotionTable error:', error);
  }
}

//
// helper: ensure (class_id, section_id) exists in class_section
//
async function ensureClassSectionId(classId, sectionId) {
  const { rows: csRows } = await db.query(
    `
      INSERT INTO class_section (class_id, section_id)
      VALUES ($1, $2)
      ON CONFLICT (class_id, section_id) DO NOTHING
      RETURNING class_section_id
    `,
    [classId, sectionId]
  );

  if (csRows.length > 0) {
    return csRows[0].class_section_id;
  }

  const { rows } = await db.query(
    `
      SELECT class_section_id
      FROM class_section
      WHERE class_id = $1 AND section_id = $2
    `,
    [classId, sectionId]
  );

  if (rows.length === 0) {
    return null;
  }
  return rows[0].class_section_id;
}

//
// 3. promote/demote a RANGE of students (and optionally change section)
//
export async function processPromotionsForRange() {
  // >>> CHANGE ONLY THESE CONSTANTS WHEN YOU RUN THIS <<<
  const ACTION_TYPE          = 'Promote';  // 'Promote' or 'Demote'
  const FROM_CLASS_ID        = 13;         // current class (e.g. Class 5)
  const FROM_SECTION_ID      = 1;          // current section (e.g. A)
  const TO_CLASS_ID          = 14;         // target class (e.g. Class 6) or same as from for demote
  const TO_SECTION_ID        = 2;          // target section (e.g. B; can be same or different)
  const START_STUDENT_ID     = 20;         // first student_id in batch
  const END_STUDENT_ID       = 40;         // last student_id in batch
  const DEFAULT_REASON       = 'Annual promotion';

  try {
    const fromCsId = await ensureClassSectionId(FROM_CLASS_ID, FROM_SECTION_ID);
    const toCsId   = await ensureClassSectionId(TO_CLASS_ID, TO_SECTION_ID);

    if (!fromCsId || !toCsId) {
      console.log('Could not resolve from/to class_section_id.');
      return;
    }

    // 1) get active students in this class_section and id range
    const { rows: students } = await db.query(
      `
        SELECT s.student_id
        FROM class_enrollment ce
        JOIN student s ON ce.student_id = s.student_id
        WHERE ce.class_section_id = $1
          AND ce.status = 'Active'
          AND s.student_id BETWEEN $2 AND $3
        ORDER BY s.student_id
      `,
      [fromCsId, START_STUDENT_ID, END_STUDENT_ID]
    );

    if (students.length === 0) {
      console.log('No active students found in given range and class_section.');
      return;
    }

    const idList = students.map(s => s.student_id).join(', ');

    // 2) insert promotion history
    const promoValues = students.map(
      s => `(${s.student_id}, ${fromCsId}, ${toCsId}, '${ACTION_TYPE}', '${DEFAULT_REASON}')`
    );

    await db.query(`
      INSERT INTO promotion (
        student_id,
        from_class_section_id,
        to_class_section_id,
        action_type,
        reason
      )
      VALUES
        ${promoValues.join(',\n')}
    `);

    // 3) mark old enrollment inactive
    await db.query(
      `
        UPDATE class_enrollment
        SET status = 'Inactive'
        WHERE class_section_id = $1
          AND student_id IN (${idList})
          AND status = 'Active'
      `,
      [fromCsId]
    );

    // 4) create new active enrollments in target class_section
    await db.query(
      `
        INSERT INTO class_enrollment (class_section_id, student_id, enrolled_on, status)
        SELECT $1 AS class_section_id,
               s.student_id,
               CURRENT_DATE,
               'Active'
        FROM student s
        WHERE s.student_id IN (${idList})
        ON CONFLICT (class_section_id, student_id) DO NOTHING
      `,
      [toCsId]
    );

    console.log(
      `Processed ${students.length} ${ACTION_TYPE.toLowerCase()} actions ` +
      `from class ${FROM_CLASS_ID} section ${FROM_SECTION_ID} ` +
      `to class ${TO_CLASS_ID} section ${TO_SECTION_ID}.`
    );
  } catch (error) {
    console.error('processPromotionsForRange error:', error);
  }
}

//
// 4. delete all promotion history (optional)
//
export async function deleteAllPromotions() {
  try {
    await db.query('DELETE FROM promotion');
    console.log('all promotions deleted.');
  } catch (error) {
    console.error('deleteAllPromotions error:', error);
  }
}

// Uncomment ONE at a time to run directly:
createPromotionTable();
// dropPromotionTable();
// processPromotionsForRange();
// deleteAllPromotions();