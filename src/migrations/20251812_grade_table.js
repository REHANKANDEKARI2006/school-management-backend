// src/migrations/20251218_grade_boundary_table.js
import db from '../config/db.js';

//
// 1. Create grade_boundary table
//
export async function createGradeBoundaryTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS grade_boundary (
        grade_id     SERIAL PRIMARY KEY,
        class_id     INTEGER NOT NULL,            -- FK to class (31..60 or per logical class)
        min_score    DOUBLE PRECISION NOT NULL,   -- percentage from 0 to 100
        max_score    DOUBLE PRECISION NOT NULL,
        grade_label  VARCHAR(10) NOT NULL,        -- A+, A, B+, ...
        grade_point  DOUBLE PRECISION NOT NULL,   -- 10, 9, 8, ...
        remarks      TEXT,
        created_at   TIMESTAMPTZ DEFAULT now(),
        updated_at   TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT grade_boundary_class_id_fkey
          FOREIGN KEY (class_id) REFERENCES public.class(class_id)
      )
    `);
    console.log('grade_boundary table ensured.');
  } catch (error) {
    console.error('createGradeBoundaryTable error:', error);
  }
}

//
// 2. Drop grade_boundary table
//
export async function dropGradeBoundaryTable() {
  try {
    await db.query('DROP TABLE IF EXISTS grade_boundary CASCADE');
    console.log('grade_boundary table dropped.');
  } catch (error) {
    console.error('dropGradeBoundaryTable error:', error);
  }
}

//
// Grade logic (same for every class):
//  A+ : 91–100  -> 10
//  A  : 81–90   -> 9
//  B+ : 71–80   -> 8
//  B  : 61–70   -> 7
//  C+ : 51–60   -> 6
//  C  : 41–50   -> 5
//  D  : 33–40   -> 4
//  F  : 0–32    -> 0
//

//
// 3. Seed grade boundaries for Classes 1–10 (sections A,B,C => class_id 31–60)
//
export async function seedGradeBoundaries() {
  try {
    const bands = [
      { min: 91, max: 100, label: 'A+', point: 10, remarks: 'Outstanding performance' },
      { min: 81, max: 90,  label: 'A',  point: 9,  remarks: 'Excellent performance' },
      { min: 71, max: 80,  label: 'B+', point: 8,  remarks: 'Very good performance' },
      { min: 61, max: 70,  label: 'B',  point: 7,  remarks: 'Good performance' },
      { min: 51, max: 60,  label: 'C+', point: 6,  remarks: 'Satisfactory performance' },
      { min: 41, max: 50,  label: 'C',  point: 5,  remarks: 'Needs improvement' },
      { min: 33, max: 40,  label: 'D',  point: 4,  remarks: 'Barely passed' },
      { min: 0,  max: 32,  label: 'F',  point: 0,  remarks: 'Failed' }
    ];

    const values = [];

    // class_id 31–60 correspond to Class 1–10 A/B/C as per your mapping
    for (let classId = 31; classId <= 60; classId++) {
      bands.forEach(b => {
        values.push(
          `(${classId}, ${b.min}, ${b.max}, '${b.label}', ${b.point}, '${b.remarks.replace("'", "''")}', now(), now())`
        );
      });
    }

    await db.query(`
      INSERT INTO grade_boundary (
        class_id,
        min_score,
        max_score,
        grade_label,
        grade_point,
        remarks,
        created_at,
        updated_at
      )
      VALUES
        ${values.join(',\n')}
    `);

    console.log('grade boundaries seeded for all classes.');
  } catch (error) {
    console.error('seedGradeBoundaries error:', error);
  }
}

//
// 4. Delete all grade boundaries
//
export async function deleteAllGradeBoundaries() {
  try {
    await db.query('DELETE FROM grade_boundary');
    console.log('all grade boundaries deleted.');
  } catch (error) {
    console.error('deleteAllGradeBoundaries error:', error);
  }
}

// Uncomment one at a time when running:
// createGradeBoundaryTable();
// dropGradeBoundaryTable();
seedGradeBoundaries();
// deleteAllGradeBoundaries();