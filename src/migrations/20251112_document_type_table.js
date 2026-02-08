// src/migrations/20251211_document_type_table.js
import db from '../config/db.js';

//
// 1. create document_type_table
//
export async function createDocumentTypeTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS document_type_table (
        doc_type_id   INTEGER PRIMARY KEY,
        description   VARCHAR(255),
        template_path VARCHAR(255)
      )
    `);
    console.log('document_type_table ensured.');
  } catch (error) {
    console.error('createDocumentTypeTable error:', error);
  }
}

//
// 2. drop document_type_table (optional)
//
export async function dropDocumentTypeTable() {
  try {
    await db.query('DROP TABLE IF EXISTS document_type_table CASCADE');
    console.log('document_type_table dropped.');
  } catch (error) {
    console.error('dropDocumentTypeTable error:', error);
  }
}

//
// 3. seed common document types (Bonafide, LC, Result, Question Paper, Notice, Advertisement, etc.)
//   NOTE: you can store either a file path or a template key in template_path.
//
export async function seedDocumentTypes() {
  try {
    const values = [
      // id, description,              template_path (relative path or key)
      `(1, 'Bonafide Certificate',    'templates/bonafide.docx')`,
      `(2, 'Leaving Certificate',     'templates/leaving_certificate.docx')`,
      `(3, 'Student Result Sheet',    'templates/result_sheet.docx')`,
      `(4, 'Question Paper',          'templates/question_paper.docx')`,
      `(5, 'General Notice',          'templates/notice.docx')`,
      `(6, 'Admission Advertisement', 'templates/advertisement.docx')`,
      `(7, 'Fee Receipt',             'templates/fee_receipt.docx')`,
      `(8, 'ID Card Template',        'templates/id_card.docx')`,
      `(9, 'Transfer Certificate',    'templates/transfer_certificate.docx')`,
      `(10,'Custom Letter',           'templates/custom_letter.docx')`
    ];

    await db.query(`
      INSERT INTO document_type_table (doc_type_id, description, template_path)
      VALUES
        ${values.join(',\n')}
      ON CONFLICT (doc_type_id) DO NOTHING
    `);

    console.log('document_type_table seeded.');
  } catch (error) {
    console.error('seedDocumentTypes error:', error);
  }
}

//
// 4. delete all document types (optional)
//
export async function deleteAllDocumentTypes() {
  try {
    await db.query('DELETE FROM document_type_table');
    console.log('all document types deleted.');
  } catch (error) {
    console.error('deleteAllDocumentTypes error:', error);
  }
}

// Uncomment ONE at a time to run directly:
// createDocumentTypeTable();
// dropDocumentTypeTable();
seedDocumentTypes();
// deleteAllDocumentTypes();