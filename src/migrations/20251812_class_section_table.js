// src/migrations/20251218_class_section_table.js
import db from '../config/db.js';

export async function createClassSectionTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS class_section (
        class_section_id SERIAL PRIMARY KEY,
        class_id         INTEGER NOT NULL,
        section_id       INTEGER NOT NULL,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now(),

        CONSTRAINT class_section_class_fkey
          FOREIGN KEY (class_id) REFERENCES public.class(class_id),
        CONSTRAINT class_section_section_fkey
          FOREIGN KEY (section_id) REFERENCES public.section(section_id)
      )
    `);
    console.log('class_section table ensured.');
  } catch (error) {
    console.error('createClassSectionTable error:', error);
  }
}

export async function seedClassSection() {
  try {
    await db.query('BEGIN');
    await db.query('DELETE FROM class_section');

    // class_id from 31 to 60
    for (let classId = 31; classId <= 60; classId++) {
      // section_id 1,2,3  (A,B,C)
      for (let sectionId = 1; sectionId <= 3; sectionId++) {
        await db.query(
          `INSERT INTO class_section (class_id, section_id)
           VALUES ($1, $2)`,
          [classId, sectionId]
        );
      }
    }

    await db.query('COMMIT');
    console.log('seedClassSection: 30 rows inserted.');
  } catch (error) {
    console.error('seedClassSection error:', error);
    await db.query('ROLLBACK');
  }
}

export async function clearClassSection() {
  try {
    await db.query('DELETE FROM class_section');
    console.log('all class_section rows deleted.');
  } catch (error) {
    console.error('clearClassSection error:', error);
  }
}

export async function dropClassSectionTable() {
  try {
    await db.query('DROP TABLE IF EXISTS class_section CASCADE');
    console.log('class_section table dropped.');
  } catch (error) {
    console.error('dropClassSectionTable error:', error);
  }
}


// Usage from Node (one at a time):
// createClassSectionTable();
seedClassSection();
// clearClassSection();
// dropClassSectionTable();
