// src/migrations/20251211_exam_type_table.js
import db from '../config/db.js';

//
// 1. create exam_type table
//
export async function createExamTypeTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS exam_type (
        exam_type_id   SERIAL PRIMARY KEY,
        exam_type_code VARCHAR(50) UNIQUE NOT NULL,
        exam_type_name VARCHAR(100)      NOT NULL,
        category       VARCHAR(50)       NOT NULL,
        description    TEXT
      )
    `);
    console.log('exam_type table ensured.');
  } catch (error) {
    console.error('createExamTypeTable error:', error);
  }
}

//
// 2. drop exam_type table (optional)
//
export async function dropExamTypeTable() {
  try {
    await db.query('DROP TABLE IF EXISTS exam_type CASCADE');
    console.log('exam_type table dropped.');
  } catch (error) {
    console.error('dropExamTypeTable error:', error);
  }
}

//
// 3. seed general exam types (written / oral / practical etc.)
//
export async function seedExamTypes() {
  try {
    const values = [
      // code,         name,                     category,     description
      `('WR_UNIT',    'Written Unit Test',      'Written',    'Regular written unit tests')`,
      `('WR_TERM',    'Written Term Exam',      'Written',    'Mid-term / half-yearly written exam')`,
      `('WR_FINAL',   'Written Final Exam',     'Written',    'Year-end written exam')`,
      `('PR_UNIT',    'Practical Unit Test',    'Practical',  'Lab / practical unit tests')`,
      `('PR_TERM',    'Practical Term Exam',    'Practical',  'Mid-term practical exam')`,
      `('PR_FINAL',   'Practical Final Exam',   'Practical',  'Year-end practical exam')`,
      `('OR_UNIT',    'Oral Unit Test',         'Oral',       'Oral / viva unit tests')`,
      `('OR_TERM',    'Oral Term Exam',         'Oral',       'Mid-term oral exam')`,
      `('OR_FINAL',   'Oral Final Exam',        'Oral',       'Year-end oral exam')`,
      `('INTERNAL',   'Internal Assessment',    'Internal',   'Projects, assignments, internal marks')`,
      `('VIVA',       'Viva Voce',              'Oral',       'Detailed viva examination')`,
      `('LAB_ONLY',   'Standalone Lab Exam',    'Practical',  'Only practical / lab components')`
    ];

    await db.query(`
      INSERT INTO exam_type (exam_type_code, exam_type_name, category, description)
      VALUES
        ${values.join(',\n')}
      ON CONFLICT (exam_type_code) DO NOTHING
    `);

    console.log('exam_type seed inserted/updated.');
  } catch (error) {
    console.error('seedExamTypes error:', error);
  }
}

//
// 4. delete all exam_type rows (optional)
//
export async function deleteAllExamTypes() {
  try {
    await db.query('DELETE FROM exam_type');
    console.log('all exam_type rows deleted.');
  } catch (error) {
    console.error('deleteAllExamTypes error:', error);
  }
}

// Uncomment ONE at a time to run directly:
// createExamTypeTable();
// dropExamTypeTable();
seedExamTypes();
// deleteAllExamTypes();