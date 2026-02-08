// src/migrations/20251219_document_generation_table.js
import db from '../config/db.js';

//
// 1. Create document_generation table with FK to document_type_table
//
export async function createDocumentGenerationTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS document_generation (
        doc_id            SERIAL PRIMARY KEY,
        doc_type_id       INTEGER NOT NULL,      -- FK to document_type_table
        generated_for_id  INTEGER NOT NULL,      -- id of student / staff / guardian
        generated_for_type VARCHAR(20) NOT NULL, -- 'student' | 'staff'
        requested_by_id   INTEGER NOT NULL,      -- user_id of requester (admin, staff, guardian)
        file_path         VARCHAR(255),
        status            VARCHAR(30) DEFAULT 'generated',
        created_at        TIMESTAMPTZ DEFAULT now(),
        updated_at        TIMESTAMPTZ DEFAULT now(),

        CONSTRAINT document_generation_doc_type_id_fkey
          FOREIGN KEY (doc_type_id) REFERENCES public.document_type_table(doc_type_id)
      );
    `);
    console.log('document_generation table ensured.');
  } catch (err) {
    console.error('createDocumentGenerationTable error:', err);
  }
}

//
// 2. Seed sample documents for existing students and staff
//    - Relies on doc_type_id 1, 2, 3 existing in document_type_table
//
export async function seedDocumentGeneration() {
  try {
    await db.query('BEGIN');
    await db.query('DELETE FROM document_generation');

    // 1) Generate a bonafide certificate (id=1) and latest fee receipt (id=2) for first 50 students
    const studentsRes = await db.query(`
      SELECT student_id, student_user_id
      FROM student
      ORDER BY student_id
      LIMIT 50
    `);

    const adminUserId = 1; // adjust if your main admin user_id is different

    for (const row of studentsRes.rows) {
      const studentId = row.student_id;

      // Bonafide certificate (doc_type_id = 1)
      await db.query(
        `
        INSERT INTO document_generation (
          doc_type_id,
          generated_for_id,
          generated_for_type,
          requested_by_id,
          file_path,
          status
        )
        VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [
          1,
          studentId,
          'student',
          adminUserId,
          `/docs/students/${studentId}/bonafide.pdf`,
          'generated'
        ]
      );

      // Fee receipt (doc_type_id = 2)
      await db.query(
        `
        INSERT INTO document_generation (
          doc_type_id,
          generated_for_id,
          generated_for_type,
          requested_by_id,
          file_path,
          status
        )
        VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [
          2,
          studentId,
          'student',
          adminUserId,
          `/docs/students/${studentId}/fee_receipt_latest.pdf`,
          'generated'
        ]
      );
    }

    // 2) Experience certificate (id=3) for first 20 staff members
    const staffRes = await db.query(`
      SELECT staff_id, user_id
      FROM staff
      ORDER BY staff_id
      LIMIT 20
    `);

    for (const row of staffRes.rows) {
      const staffId = row.staff_id;

      await db.query(
        `
        INSERT INTO document_generation (
          doc_type_id,
          generated_for_id,
          generated_for_type,
          requested_by_id,
          file_path,
          status
        )
        VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [
          3,
          staffId,
          'staff',
          adminUserId,
          `/docs/staff/${staffId}/experience_certificate.pdf`,
          'generated'
        ]
      );
    }

    await db.query('COMMIT');
    console.log('seedDocumentGeneration completed.');
  } catch (err) {
    console.error('seedDocumentGeneration error:', err);
    await db.query('ROLLBACK');
  }
}

//
// 3. Clear all document_generation records
//
export async function clearDocumentGeneration() {
  try {
    await db.query('DELETE FROM document_generation');
    console.log('all document_generation rows deleted.');
  } catch (err) {
    console.error('clearDocumentGeneration error:', err);
  }
}

//
// 4. Drop document_generation table
//
export async function dropDocumentGenerationTable() {
  try {
    await db.query('DROP TABLE IF EXISTS document_generation CASCADE');
    console.log('document_generation table dropped.');
  } catch (err) {
    console.error('dropDocumentGenerationTable error:', err);
  }
}

// Run one at a time:
// createDocumentGenerationTable();
seedDocumentGeneration();
// clearDocumentGeneration();
// dropDocumentGenerationTable();