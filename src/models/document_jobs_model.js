import pool from '../config/db.js';

export const DocumentJobsModel = {

  /**
   * Create a new bulk document generation job.
   * Returns the created job row.
   */
  async create({ instituteId, requestedBy, documentType, templateId, scopeType, scopeIds, totalCount, layoutType = 'grid' }) {
    const normLayout = (layoutType === 'single') ? 'single' : 'grid';
    const { rows } = await pool.query(
      `INSERT INTO document_jobs
        (institute_id, requested_by, document_type, template_id, scope_type, scope_ids, total_count, status, layout_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'queued', $8)
       RETURNING *`,
      [instituteId, requestedBy, documentType, templateId, scopeType, scopeIds, totalCount, normLayout]
    );
    return rows[0];
  },

  /**
   * Get a job by ID (with institute isolation).
   */
  async findById(jobId, instituteId) {
    const { rows } = await pool.query(
      `SELECT * FROM document_jobs WHERE job_id = $1 AND institute_id = $2`,
      [jobId, instituteId]
    );
    return rows[0] || null;
  },

  /**
   * Update job status to 'processing'.
   */
  async markProcessing(jobId) {
    await pool.query(
      `UPDATE document_jobs SET status = 'processing', updated_at = NOW() WHERE job_id = $1`,
      [jobId]
    );
  },

  /**
   * Update progress count (called after each batch).
   */
  async updateProgress(jobId, progressCount) {
    await pool.query(
      `UPDATE document_jobs SET progress_count = $2, updated_at = NOW() WHERE job_id = $1`,
      [jobId, progressCount]
    );
  },

  /**
   * Mark job as completed with the output file URL and skipped student log.
   */
  async markCompleted(jobId, outputFileUrl, fileSizeBytes, skippedStudents = []) {
    await pool.query(
      `UPDATE document_jobs
       SET status = 'completed',
           progress_count = total_count,
           output_file_url = $2,
           file_size_bytes = $3,
           skipped_students = $4::jsonb,
           completed_at = NOW(),
           updated_at = NOW()
       WHERE job_id = $1`,
      [jobId, outputFileUrl, fileSizeBytes, JSON.stringify(skippedStudents)]
    );
  },

  /**
   * Mark job as failed with an error message.
   */
  async markFailed(jobId, errorMessage) {
    await pool.query(
      `UPDATE document_jobs
       SET status = 'failed',
           error_message = $2,
           completed_at = NOW(),
           updated_at = NOW()
       WHERE job_id = $1`,
      [jobId, errorMessage]
    );
  },

  /**
   * List all jobs for an institute, most recent first.
   * Optionally filter by status.
   */
  async listByInstitute(instituteId, { status = null, limit = 20, offset = 0 } = {}) {
    let query = `SELECT job_id, document_type, scope_type, status, progress_count, total_count,
                        output_file_url, file_size_bytes, created_at, completed_at
                 FROM document_jobs
                 WHERE institute_id = $1`;
    const params = [instituteId];
    let idx = 2;

    if (status) {
      query += ` AND status = $${idx++}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    return rows;
  },

  /**
   * Delete completed/failed jobs older than the given number of days.
   * Returns the count of deleted rows.
   */
  async cleanupOldJobs(olderThanDays = 7) {
    const { rowCount } = await pool.query(
      `DELETE FROM document_jobs
       WHERE status IN ('completed', 'failed')
         AND created_at < NOW() - INTERVAL '1 day' * $1`,
      [olderThanDays]
    );
    return rowCount;
  }
};
