// src/migrations/20251219_fee_category_table.js
import db from '../config/db.js';

//
// 1. Create fee_category table
//
export async function createFeeCategoryTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS fee_category (
        fee_category_id SERIAL PRIMARY KEY,
        category_name   VARCHAR(100) NOT NULL UNIQUE,
        description     TEXT,
        is_active       BOOLEAN DEFAULT true,
        created_at      TIMESTAMPTZ DEFAULT now(),
        updated_at      TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('fee_category table ensured.');
  } catch (err) {
    console.error('createFeeCategoryTable error:', err);
  }
}

//
// 2. Seed standard Indian school fee categories
//
export async function seedFeeCategory() {
  try {
    await db.query('BEGIN');
    await db.query('DELETE FROM fee_category');

    const categories = [
      {
        name: 'Tuition Fee',                       // core academic instruction
        desc: 'Regular academic instruction and classroom teaching charges.'
      },
      {
        name: 'Development Fee',                   // infra / capital
        desc: 'Infrastructure development, building maintenance and capital improvements.'
      },
      {
        name: 'Examination Fee',
        desc: 'Costs of conducting tests and exams, evaluation and report generation.'
      },
      {
        name: 'Library Fee',
        desc: 'Library maintenance, books, journals and reading resources.'
      },
      {
        name: 'Laboratory Fee',
        desc: 'Science, computer and other lab consumables and maintenance.'
      },
      {
        name: 'Transport Fee',
        desc: 'School bus or van transportation charges based on routes.'
      },
      {
        name: 'Other Expenses Fee',
        desc: 'Miscellaneous activities such as co‑curricular events, activities and admin charges.'
      }
    ];

    for (const c of categories) {
      await db.query(
        `
        INSERT INTO fee_category (category_name, description)
        VALUES ($1, $2)
        ON CONFLICT (category_name) DO UPDATE
          SET description = EXCLUDED.description,
              updated_at  = now()
        `,
        [c.name, c.desc]
      );
    }

    await db.query('COMMIT');
    console.log('seedFeeCategory: standard fee heads inserted.');
  } catch (err) {
    console.error('seedFeeCategory error:', err);
    await db.query('ROLLBACK');
  }
}

//
// 3. Clear all fee categories
//
export async function clearFeeCategory() {
  try {
    await db.query('DELETE FROM fee_category');
    console.log('all fee_category rows deleted.');
  } catch (err) {
    console.error('clearFeeCategory error:', err);
  }
}

//
// 4. Drop fee_category table
//
export async function dropFeeCategoryTable() {
  try {
    await db.query('DROP TABLE IF EXISTS fee_category CASCADE');
    console.log('fee_category table dropped.');
  } catch (err) {
    console.error('dropFeeCategoryTable error:', err);
  }
}


// Run one at a time:
// createFeeCategoryTable();
seedFeeCategory();
// clearFeeCategory();
// dropFeeCategoryTable();
