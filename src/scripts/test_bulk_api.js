import pool from '../config/db.js';
import { DocumentJobsModel } from '../models/document_jobs_model.js';
import { processBulkDocumentJob } from '../services/bulk_document_worker.js';

async function testBulkIntegration() {
  console.log("Starting Bulk Document Generator end-to-end test...");

  // Find a valid institute ID from database that has students
  const instRes = await pool.query(`
    SELECT u.institute_id, COUNT(*) as count
    FROM student s
    JOIN "user" u ON u.user_id = s.student_user_id
    WHERE s.is_deleted = FALSE
    GROUP BY u.institute_id
    ORDER BY count DESC
    LIMIT 1
  `);

  if (instRes.rows.length === 0) {
    console.error("❌ No active students in DB to test!");
    process.exit(1);
  }

  const instituteId = instRes.rows[0].institute_id;
  console.log(`Found institute_id ${instituteId} with ${instRes.rows[0].count} students.`);

  // 1. Create ID Card job for Whole School
  console.log("1. Creating whole_school ID_CARD job...");
  const job = await DocumentJobsModel.create({
    instituteId,
    requestedBy: 1,
    documentType: 'ID_CARD',
    templateId: 'template1',
    scopeType: 'whole_school',
    scopeIds: [],
    totalCount: parseInt(instRes.rows[0].count)
  });

  console.log(`Job created! Job ID: ${job.job_id}, initial status: ${job.status}`);

  // 2. Process worker
  console.log("2. Running background worker for Job ID:", job.job_id);
  await processBulkDocumentJob(job.job_id, instituteId);

  // 3. Poll final status
  const finalJob = await DocumentJobsModel.findById(job.job_id, instituteId);
  console.log("3. Final Job Status:", {
    job_id: finalJob.job_id,
    status: finalJob.status,
    progress_count: finalJob.progress_count,
    total_count: finalJob.total_count,
    output_file_url: finalJob.output_file_url,
    skipped_students_count: (finalJob.skipped_students || []).length
  });

  if (finalJob.status === 'completed' && finalJob.output_file_url) {
    console.log("✅ E2E Bulk Document Generator Test PASSED!");
  } else {
    console.error("❌ E2E Bulk Document Generator Test FAILED:", finalJob.error_message);
  }

  process.exit(0);
}

testBulkIntegration().catch(err => {
  console.error("❌ Test crashed:", err);
  process.exit(1);
});
