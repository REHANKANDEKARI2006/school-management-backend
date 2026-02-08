// src/migrations/20251218_notice_audience_table.js
import db from '../config/db.js';

//
// 1. Create notice_audience table
//
export async function createNoticeAudienceTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS notice_audience (
        audience_id        SERIAL PRIMARY KEY,
        -- What kind of audience this row represents
        audience_type      VARCHAR(30) NOT NULL, 
        -- Points to a concrete entity when needed
        class_id           INTEGER,
        section_id         INTEGER,
        department_id      INTEGER,
        audience_name      VARCHAR(150) NOT NULL,

        CONSTRAINT notice_audience_class_fkey
          FOREIGN KEY (class_id) REFERENCES public.class(class_id),
        CONSTRAINT notice_audience_section_fkey
          FOREIGN KEY (section_id) REFERENCES public.section(section_id),
        CONSTRAINT notice_audience_dept_fkey
          FOREIGN KEY (department_id) REFERENCES public.department(dept_id)
      )
    `);
    console.log('notice_audience table ensured.');
  } catch (error) {
    console.error('createNoticeAudienceTable error:', error);
  }
}

//
// 2. Drop table
//
export async function dropNoticeAudienceTable() {
  try {
    await db.query('DROP TABLE IF EXISTS notice_audience CASCADE');
    console.log('notice_audience table dropped.');
  } catch (error) {
    console.error('dropNoticeAudienceTable error:', error);
  }
}

//
// 3. Seed typical audiences
//    Assumes you already have class / section / department rows.
//    Adjust IDs (1,2,3,...) to match your real data.
//
export async function seedNoticeAudience() {
  try {
    const values = [
      // Whole‑school audiences
      `('ALL_SCHOOL',   NULL, NULL, NULL, 'Entire School')`,
      `('ALL_STUDENTS', NULL, NULL, NULL, 'All Students')`,
      `('ALL_STAFF',    NULL, NULL, NULL, 'All Staff')`,

      // Department‑level audiences
      `('DEPARTMENT',   NULL, NULL, 1, 'Language Department')`,
      `('DEPARTMENT',   NULL, NULL, 2, 'Science Department')`,
      `('DEPARTMENT',   NULL, NULL, 3, 'Mathematics Department')`,
      `('DEPARTMENT',   NULL, NULL, 4, 'Social Science Department')`,

      // Class‑level audiences (example IDs)
      `('CLASS',        31,  NULL, NULL, 'Class 1 - All Sections')`,
      `('CLASS',        35,  NULL, NULL, 'Class 3 - All Sections')`,
      `('CLASS',        41,  NULL, NULL, 'Class 5 - All Sections')`,
      `('CLASS',        51,  NULL, NULL, 'Class 8 - All Sections')`,
      `('CLASS',        59,  NULL, NULL, 'Class 10 - All Sections')`,

      // Class‑section audiences (examples)
      `('SECTION',      46, 1, NULL, 'Class 6 - Section A')`,
      `('SECTION',      47, 2, NULL, 'Class 6 - Section B')`,
      `('SECTION',      48, 3, NULL, 'Class 6 - Section C')`,
      `('SECTION',      49, 2, NULL, 'Class 7 - Section B')`
    ];

    await db.query(`
      INSERT INTO notice_audience (
        audience_type,
        class_id,
        section_id,
        department_id,
        audience_name
      )
      VALUES
        ${values.join(',\n')}
    `);

    console.log('notice_audience seeded.');
  } catch (error) {
    console.error('seedNoticeAudience error:', error);
  }
}

//
// 4. Delete all rows
//
export async function deleteAllNoticeAudience() {
  try {
    await db.query('DELETE FROM notice_audience');
    console.log('all notice_audience rows deleted.');
  } catch (error) {
    console.error('deleteAllNoticeAudience error:', error);
  }
}


// Uncomment ONE at a time to run directly:
// createNoticeAudienceTable();
// dropNoticeAudienceTable();
seedNoticeAudience();
// deleteAllNoticeAudience();
