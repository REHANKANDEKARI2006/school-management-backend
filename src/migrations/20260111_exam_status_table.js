// src/migrations/20260111_exam_status_table.js
import db from '../config/db.js';

//
// 1. Create exam_status table
//
export async function createExamStatusTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS exam_status (
        exam_status_id   SERIAL PRIMARY KEY,
        exam_status_name VARCHAR(50) NOT NULL UNIQUE,
        description      TEXT,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now()
      );
    `);
    console.log('exam_status table ensured.');
  } catch (err) {
    console.error('createExamStatusTable error:', err);
  }
}

//
// 2. Seed exam statuses (Upcoming, Scheduled, Completed, Cancelled)
//
export async function seedExamStatus() {
  try {
    const statuses = [
      { name: 'Upcoming',  desc: 'Exam is planned but specific dates may be tentative.' },
      { name: 'Scheduled', desc: 'Exam is fully scheduled with fixed dates and times.' },
      { name: 'Completed', desc: 'Exam has been conducted successfully.' },
      { name: 'Cancelled', desc: 'Exam was cancelled and will not take place.' }
    ];

    for (const s of statuses) {
      await db.query(
        `INSERT INTO exam_status (exam_status_name, description)
         VALUES ($1, $2)
         ON CONFLICT (exam_status_name) DO NOTHING`,
        [s.name, s.desc]
      );
    }
    console.log('exam_status table seeded with 4 main statuses.');
  } catch (err) {
    console.error('seedExamStatus error:', err);
  }
}

//
// 3. Clear all exam_status records
//
export async function clearExamStatus() {
  try {
    await db.query('DELETE FROM exam_status');
    console.log('all exam_status rows deleted.');
  } catch (err) {
    console.error('clearExamStatus error:', err);
  }
}

//
// 4. Drop exam_status table
//
export async function dropExamStatusTable() {
  try {
    await db.query('DROP TABLE IF EXISTS exam_status CASCADE');
    console.log('exam_status table dropped.');
  } catch (err) {
    console.error('dropExamStatusTable error:', err);
  }
}


// Run one at a time:
// createExamStatusTable();
seedExamStatus();
// clearExamStatus();
// dropExamStatusTable();
