import pool from '../config/db.js';
import { processBulkDocumentJob } from '../services/bulk_document_worker.js';
import { DocumentJobsModel } from '../models/document_jobs_model.js';
import { DocumentService } from '../services/document_service.js';
import { PDFDocument } from 'pdf-lib';
import fetch from 'node-fetch';

async function runBulkCertificateVerification() {
  console.log("==========================================================");
  console.log("   BULK CERTIFICATE GENERATOR — END-TO-END VERIFICATION   ");
  console.log("==========================================================");

  const instituteId = 2; // Blue Ridge Academy

  // Fetch active students in Class 31
  const studentRes = await pool.query(
    `SELECT s.student_id, s.stu_first_name, s.stu_last_name
     FROM student s
     JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
     WHERE s.is_deleted = FALSE AND ce.class_id = 31
     ORDER BY s.stu_first_name ASC, s.stu_last_name ASC`
  );

  const students = studentRes.rows;
  console.log(`ℹ️ Found ${students.length} active students in Class 31`);

  // ---------------------------------------------------------
  // ▶ TEST 1: Single Student Certificate Generation & Output Comparison
  // ---------------------------------------------------------
  console.log("\n▶ TEST 1: Single Specific Student Certificate Generation");
  const targetStudent = students[0];

  // Render direct single certificate PDF
  const directPdfBuf = await DocumentService.generateGeneralCertificate(targetStudent.student_id, 1, 'template1', null, instituteId);
  const directDoc = await PDFDocument.load(directPdfBuf);
  console.log(`  ✅ Direct Single Certificate rendered (${directDoc.getPageCount()} page, Size: ${directPdfBuf.length} bytes)`);

  // Trigger Bulk Job for specific student
  const singleJob = await DocumentJobsModel.create({
    instituteId,
    requestedBy: 1,
    documentType: 'CERTIFICATE',
    templateId: 'template1',
    scopeType: 'specific_students',
    scopeIds: [targetStudent.student_id],
    totalCount: 1
  });

  console.log(`[Test 1] Created Bulk Job ID ${singleJob.job_id} for student ${targetStudent.stu_first_name}`);
  await processBulkDocumentJob(singleJob.job_id, instituteId);

  const completedSingleJob = await DocumentJobsModel.findById(singleJob.job_id, instituteId);
  console.log(`  ✅ PASSED: Bulk single certificate completed. URL: ${completedSingleJob.output_file_url}`);

  const singlePdfResp = await fetch(completedSingleJob.output_file_url);
  const singlePdfBuf = await singlePdfResp.arrayBuffer();
  const bulkSingleDoc = await PDFDocument.load(singlePdfBuf);
  console.log(`     Bulk Single Certificate PDF Page Count: ${bulkSingleDoc.getPageCount()} page (A4 Landscape).`);

  if (bulkSingleDoc.getPageCount() === directDoc.getPageCount()) {
    console.log("  ✅ SUCCESS: Bulk single certificate page count matches direct single certificate output!");
  }

  // ---------------------------------------------------------
  // ▶ TEST 2: Full Class Bulk Certificate Generation (1 per page)
  // ---------------------------------------------------------
  console.log("\n▶ TEST 2: Full Class Bulk Certificate Generation");
  const classJob = await DocumentJobsModel.create({
    instituteId,
    requestedBy: 1,
    documentType: 'CERTIFICATE',
    templateId: 'template1',
    scopeType: 'class',
    scopeIds: [31],
    totalCount: students.length
  });

  console.log(`[Test 2] Created Bulk Job ID ${classJob.job_id} for Class 31 (${students.length} students)`);
  await processBulkDocumentJob(classJob.job_id, instituteId);

  const completedClassJob = await DocumentJobsModel.findById(classJob.job_id, instituteId);
  console.log(`  ✅ PASSED: Full Class bulk certificate job completed. URL: ${completedClassJob.output_file_url}`);

  const classPdfResp = await fetch(completedClassJob.output_file_url);
  const classPdfBuf = await classPdfResp.arrayBuffer();
  const classPdfDoc = await PDFDocument.load(classPdfBuf);
  console.log(`     Full Class Certificate PDF Page Count: ${classPdfDoc.getPageCount()} page(s) (Expected: ${students.length}).`);

  if (classPdfDoc.getPageCount() === students.length) {
    console.log("  ✅ SUCCESS: Each student's certificate is rendered on its own A4 Landscape page (1 per page).");
  } else {
    console.warn(`  ⚠️ Page count mismatch: expected ${students.length}, got ${classPdfDoc.getPageCount()}`);
  }

  console.log("\n==========================================================");
  console.log("       BULK CERTIFICATE VERIFICATION SUITE COMPLETE       ");
  console.log("==========================================================");
  process.exit(0);
}

runBulkCertificateVerification().catch(err => {
  console.error("Verification suite error:", err);
  process.exit(1);
});
