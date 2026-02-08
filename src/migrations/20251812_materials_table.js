// src/migrations/20251218_materials_table.js
import db from '../config/db.js';

//
// 1. Create materials table
//
export async function createMaterialsTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS materials (
        material_id    SERIAL PRIMARY KEY,
        material_name  VARCHAR(150) NOT NULL,
        subject_id     INTEGER NOT NULL,
        class_id       INTEGER NOT NULL,
        file_path      VARCHAR(255) NOT NULL,
        upload_date    DATE NOT NULL,
        updated_at     TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT materials_subject_id_fkey
          FOREIGN KEY (subject_id) REFERENCES public.subject(subject_id),
        CONSTRAINT materials_class_id_fkey
          FOREIGN KEY (class_id) REFERENCES public.class(class_id)
      )
    `);
    console.log('materials table ensured.');
  } catch (error) {
    console.error('createMaterialsTable error:', error);
  }
}

//
// 2. Drop materials table
//
export async function dropMaterialsTable() {
  try {
    await db.query('DROP TABLE IF EXISTS materials CASCADE');
    console.log('materials table dropped.');
  } catch (error) {
    console.error('dropMaterialsTable error:', error);
  }
}

//
// 3. Seed demo materials (notes & assignments for different classes/subjects)
//   Assumptions (adjust IDs to your real data):
//   subject_id: 1=English, 2=Hindi, 3=Maths, 4=Science, 5=History, 6=Geography
//   class_id:   31..60 = Class 1A..10C
//
export async function seedMaterials() {
  try {
    const values = [
      // Class 1 (A,B) – English & Maths notes
      `('Class 1 English - Chapter 1 Notes',
        1, 31,
        'https://drive.google.com/file/d/1ENG1CLS1A/view?usp=sharing',
        '2026-06-15', now())`,
      `('Class 1 English - Chapter 2 Notes',
        1, 32,
        'https://drive.google.com/file/d/1ENG2CLS1B/view?usp=sharing',
        '2026-06-20', now())`,
      `('Class 1 Maths - Chapter 1 Worksheet',
        3, 31,
        'https://drive.google.com/file/d/1MATH1CLS1A/view?usp=sharing',
        '2026-06-18', now())`,
      `('Class 1 Maths - Chapter 2 Assignment',
        3, 32,
        'https://drive.google.com/file/d/1MATH2CLS1B/view?usp=sharing',
        '2026-06-25', now())`,

      // Class 3 (C) – EVS / Science
      `('Class 3 Science - Chapter 3 Notes',
        4, 39,
        'https://drive.google.com/file/d/1SCI3CLS3C/view?usp=sharing',
        '2026-07-05', now())`,
      `('Class 3 Science - Chapter 4 Activity Sheet',
        4, 37,
        'https://drive.google.com/file/d/1SCI4CLS3A/view?usp=sharing',
        '2026-07-10', now())`,

      // Class 5 – English, Maths, Science
      `('Class 5 English - Poem 1 Notes',
        1, 43,
        'https://drive.google.com/file/d/1ENGP1CLS5A/view?usp=sharing',
        '2026-07-20', now())`,
      `('Class 5 Maths - Fractions Chapter Notes',
        3, 45,
        'https://drive.google.com/file/d/1MATHFRACCLS5C/view?usp=sharing',
        '2026-07-25', now())`,
      `('Class 5 Science - Chapter 6 Assignment',
        4, 44,
        'https://drive.google.com/file/d/1SCI6CLS5B/view?usp=sharing',
        '2026-07-28', now())`,

      // Class 7 – History & Geography
      `('Class 7 History - Chapter 1 Notes',
        5, 49,
        'https://drive.google.com/file/d/1HIST1CLS7A/view?usp=sharing',
        '2026-08-05', now())`,
      `('Class 7 History - Chapter 2 Assignment',
        5, 51,
        'https://drive.google.com/file/d/1HIST2CLS7C/view?usp=sharing',
        '2026-08-10', now())`,
      `('Class 7 Geography - Chapter 3 Map Practice',
        6, 50,
        'https://drive.google.com/file/d/1GEOG3CLS7B/view?usp=sharing',
        '2026-08-12', now())`,

      // Class 8 – English & Science
      `('Class 8 English - Prose 1 Notes',
        1, 52,
        'https://drive.google.com/file/d/1ENGPRO1CLS8A/view?usp=sharing',
        '2026-08-18', now())`,
      `('Class 8 Science - Chapter 4 Lab Manual',
        4, 53,
        'https://drive.google.com/file/d/1SCILAB4CLS8B/view?usp=sharing',
        '2026-08-22', now())`,

      // Class 9 – Board‑oriented materials
      `('Class 9 Maths - Chapter 1 Formula Sheet',
        3, 56,
        'https://drive.google.com/file/d/1MATHFORM1CLS9B/view?usp=sharing',
        '2026-09-01', now())`,
      `('Class 9 Science - Physics Chapter 2 Notes',
        4, 55,
        'https://drive.google.com/file/d/1PHY2CLS9A/view?usp=sharing',
        '2026-09-03', now())`,
      `('Class 9 English - Practice Question Bank',
        1, 57,
        'https://drive.google.com/file/d/1ENGBANKCLS9C/view?usp=sharing',
        '2026-09-05', now())`,

      // Class 10 – Board‑level assignments
      `('Class 10 Maths - Trigonometry Chapter Notes',
        3, 59,
        'https://drive.google.com/file/d/1MATTRIGCLS10B/view?usp=sharing',
        '2026-09-15', now())`,
      `('Class 10 Science - Chemistry Chapter 3 Notes',
        4, 58,
        'https://drive.google.com/file/d/1CHEM3CLS10A/view?usp=sharing',
        '2026-09-18', now())`,
      `('Class 10 History - Nationalism in India Notes',
        5, 60,
        'https://drive.google.com/file/d/1HISTNATCLS10C/view?usp=sharing',
        '2026-09-20', now())`,
      `('Class 10 English - Sample Paper 1',
        1, 58,
        'https://drive.google.com/file/d/1ENGSAMPLE1CLS10A/view?usp=sharing',
        '2026-10-01', now())`
    ];

    await db.query(`
      INSERT INTO materials (
        material_name,
        subject_id,
        class_id,
        file_path,
        upload_date,
        updated_at
      )
      VALUES
        ${values.join(',\n')}
    `);

    console.log('materials seeded.');
  } catch (error) {
    console.error('seedMaterials error:', error);
  }
}

//
// 4. Delete all materials
//
export async function deleteAllMaterials() {
  try {
    await db.query('DELETE FROM materials');
    console.log('all materials deleted.');
  } catch (error) {
    console.error('deleteAllMaterials error:', error);
  }
}


// Uncomment ONE at a time when running this file:
// createMaterialsTable();
// dropMaterialsTable();
seedMaterials();
// deleteAllMaterials();