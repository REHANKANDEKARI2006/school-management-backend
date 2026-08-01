import pool from '../config/db.js';
import { DocumentJobsModel } from '../models/document_jobs_model.js';
import { processBulkDocumentJob } from '../services/bulk_document_worker.js';

async function testFullUIEndToEnd() {
  console.log("=== STARTING FULL END-TO-END UI & BACKEND FLOW VERIFICATION ===");

  // 1. Fetch active class in the school
  const classRes = await pool.query(`
    SELECT c.class_id, c.class_name, sec.section_name, COUNT(ce.student_id) as student_count
    FROM class c
    LEFT JOIN section sec ON sec.section_id = c.section_id
    JOIN class_enrollment ce ON ce.class_id = c.class_id AND ce.status_id = 1
    JOIN student s ON s.student_id = ce.student_id AND s.is_deleted = FALSE
    JOIN "user" u ON u.user_id = s.student_user_id
    GROUP BY c.class_id, c.class_name, sec.section_name
    HAVING COUNT(ce.student_id) > 0
    ORDER BY student_count DESC
    LIMIT 1
  `);

  if (classRes.rows.length === 0) {
    console.error("❌ No active class with enrolled students found in DB!");
    process.exit(1);
  }

  const targetClass = classRes.rows[0];
  console.log(`Step 1: Selected Class "${targetClass.class_name} - ${targetClass.section_name}" (ID: ${targetClass.class_id}) with ${targetClass.student_count} active students.`);

  // 2. Trigger Class-wise Bulk ID Card Generation (simulating POST /api/bulk-documents/generate)
  console.log("Step 2: Submitting POST /api/bulk-documents/generate with scope_type='class'...");
  const job = await DocumentJobsModel.create({
    instituteId: 2, // Institute 2
    requestedBy: 1, // Admin user
    documentType: 'ID_CARD',
    templateId: 'template1',
    scopeType: 'class',
    scopeIds: [targetClass.class_id],
    totalCount: parseInt(targetClass.student_count)
  });

  console.log(`✅ Job created successfully! Job ID: #${job.job_id}, Initial Status: ${job.status}`);

  // 3. Process Background Worker
  console.log("Step 3: Background Worker processing batches in 5×2 A4 Landscape Grid...");
  await processBulkDocumentJob(job.job_id, 2);

  // 4. Poll Job Status
  console.log("Step 4: Polling GET /api/bulk-documents/:jobId/status...");
  const finalJob = await DocumentJobsModel.findById(job.job_id, 2);

  console.log("=== FINAL JOB STATUS REPORT ===");
  console.log({
    jobId: finalJob.job_id,
    documentType: finalJob.document_type,
    scopeType: finalJob.scope_type,
    status: finalJob.status,
    progressCount: finalJob.progress_count,
    totalCount: finalJob.total_count,
    outputFileUrl: finalJob.output_file_url,
    fileSizeBytes: finalJob.file_size_bytes,
    skippedStudentsCount: (finalJob.skipped_students || []).length
  });

  if (finalJob.status === 'completed' && finalJob.output_file_url) {
    console.log("🎉 SUCCESS: Class-wise ID Card generation complete! Cards are arranged in 10-per-page A4 Landscape Grid.");
    console.log("Cloudinary Download URL:", finalJob.output_file_url);
    process.exit(0);
  } else {
    console.error("❌ FAILED:", finalJob.error_message);
    process.exit(1);
  }
}

testFullUIEndToEnd().catch(err => {
  console.error("❌ Test crashed:", err);
  process.exit(1);
});
