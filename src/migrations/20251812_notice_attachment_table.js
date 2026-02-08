// src/migrations/20251218_notice_attachments_table.js
import db from '../config/db.js';

//
// 1. Create notice_attachment table
//
export async function createNoticeAttachmentTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS notice_attachment (
        attachment_id SERIAL PRIMARY KEY,
        notice_id     INTEGER NOT NULL,
        file_url      VARCHAR(255) NOT NULL,
        file_type     VARCHAR(50),
        created_at    TIMESTAMPTZ DEFAULT now(),
        updated_at    TIMESTAMPTZ DEFAULT now(),

        CONSTRAINT notice_attachment_notice_fkey
          FOREIGN KEY (notice_id) REFERENCES public.notices(notice_id)
          ON DELETE CASCADE
      )
    `);
    console.log('notice_attachment table ensured.');
  } catch (error) {
    console.error('createNoticeAttachmentTable error:', error);
  }
}

//
// 2. Drop notice_attachment table
//
export async function dropNoticeAttachmentTable() {
  try {
    await db.query('DROP TABLE IF EXISTS notice_attachment CASCADE');
    console.log('notice_attachment table dropped.');
  } catch (error) {
    console.error('dropNoticeAttachmentTable error:', error);
  }
}

//
// 3. Seed some demo attachments for existing notices
//    Adjust notice_id values so they match rows already in "notices".
//
export async function seedNoticeAttachments() {
  try {
    const values = [
      // PDF circular for whole‑school notice (example notice_id = 1)
      `(1,
        'https://drive.google.com/file/d/NOTICE_REOPEN_PDF/view?usp=sharing',
        'pdf',
        now(), now())`,
      // Image poster for essay competition (example notice_id = 3)
      `(3,
        'https://drive.google.com/file/d/LANG_ESSAY_POSTER/view?usp=sharing',
        'image',
        now(), now())`,
      // Pre‑board schedule PDF (example notice_id = 6)
      `(6,
        'https://drive.google.com/file/d/PREBOARD_SCHEDULE_PDF/view?usp=sharing',
        'pdf',
        now(), now())`
    ];

    await db.query(`
      INSERT INTO notice_attachment (
        notice_id,
        file_url,
        file_type,
        created_at,
        updated_at
      )
      VALUES
        ${values.join(',\n')}
    `);

    console.log('notice_attachment seeded.');
  } catch (error) {
    console.error('seedNoticeAttachments error:', error);
  }
}

//
// 4. Delete all notice_attachment rows
//
export async function deleteAllNoticeAttachments() {
  try {
    await db.query('DELETE FROM notice_attachment');
    console.log('all notice_attachment rows deleted.');
  } catch (error) {
    console.error('deleteAllNoticeAttachments error:', error);
  }
}

// Uncomment ONE at a time when running this file:
// createNoticeAttachmentTable();
// dropNoticeAttachmentTable();
seedNoticeAttachments();
// deleteAllNoticeAttachments();