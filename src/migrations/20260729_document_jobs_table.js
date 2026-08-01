// src/migrations/20260729_document_jobs_table.js
import db from '../config/db.js';

/**
 * Create the document_jobs table for tracking bulk document generation jobs.
 * This table powers the async job queue — jobs are created with status 'queued',
 * processed in the background, and polled by the frontend for progress.
 */
export async function createDocumentJobsTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS document_jobs (
        job_id          SERIAL PRIMARY KEY,
        institute_id    INTEGER NOT NULL,
        requested_by    INTEGER NOT NULL,
        document_type   VARCHAR(30) NOT NULL,
        template_id     VARCHAR(50),
        scope_type      VARCHAR(20) NOT NULL,
        scope_ids       INTEGER[] DEFAULT '{}',
        status          VARCHAR(20) DEFAULT 'queued',
        progress_count  INTEGER DEFAULT 0,
        total_count     INTEGER DEFAULT 0,
        skipped_students JSONB DEFAULT '[]',
        error_message   TEXT,
        output_file_url TEXT,
        file_size_bytes BIGINT,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW(),
        completed_at    TIMESTAMPTZ
      );

      ALTER TABLE document_jobs ADD COLUMN IF NOT EXISTS skipped_students JSONB DEFAULT '[]';

      CREATE INDEX IF NOT EXISTS idx_document_jobs_institute ON document_jobs(institute_id);
      CREATE INDEX IF NOT EXISTS idx_document_jobs_status ON document_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_document_jobs_requested_by ON document_jobs(requested_by);
    `);
    console.log('✅ document_jobs table created successfully.');
  } catch (err) {
    console.error('❌ createDocumentJobsTable error:', err);
  }
}

/**
 * Drop the document_jobs table.
 */
export async function dropDocumentJobsTable() {
  try {
    await db.query('DROP TABLE IF EXISTS document_jobs CASCADE');
    console.log('document_jobs table dropped.');
  } catch (err) {
    console.error('dropDocumentJobsTable error:', err);
  }
}

// Uncomment the function you want to run:
// createDocumentJobsTable();
// dropDocumentJobsTable();
