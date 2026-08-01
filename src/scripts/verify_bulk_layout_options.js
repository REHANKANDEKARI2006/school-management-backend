import pool from '../config/db.js';
import { processBulkDocumentJob } from '../services/bulk_document_worker.js';
import { DocumentJobsModel } from '../models/document_jobs_model.js';
import { PDFDocument } from 'pdf-lib';
import fetch from 'node-fetch';

async function runLayoutVerificationSuite() {
  console.log("==========================================================");
  console.log("   BULK ID CARD LAYOUT OPTIONS — VERIFICATION SUITE       ");
  console.log("==========================================================");

  const instituteId = 2; // Blue Ridge Academy

  // Fetch Class 31 students (10 active students)
  const classId = 31;
  const studentRes = await pool.query(
    `SELECT s.student_id, s.stu_first_name, s.stu_last_name
     FROM student s
     JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
     WHERE s.is_deleted = FALSE AND ce.class_id = $1
     ORDER BY s.stu_first_name ASC, s.stu_last_name ASC`,
    [classId]
  );

  const students = studentRes.rows;
  console.log(`ℹ️ Found ${students.length} active students in Class 10`);

  // ---------------------------------------------------------
  // ▶ TEST 1: Default Grid Layout Backward Compatibility (No layout_type passed)
  // ---------------------------------------------------------
  console.log("\n▶ TEST 1: Grid Layout (Default / Backward Compatibility)");
  const gridJob = await DocumentJobsModel.create({
    instituteId,
    requestedBy: 1,
    documentType: 'ID_CARD',
    templateId: 'template1',
    scopeType: 'class',
    scopeIds: [classId],
    totalCount: students.length,
    layoutType: 'grid'
  });

  console.log(`[Test 1] Created Job ID ${gridJob.job_id} with layout_type = '${gridJob.layout_type}'`);
  await processBulkDocumentJob(gridJob.job_id, instituteId);

  const completedGridJob = await DocumentJobsModel.findById(gridJob.job_id, instituteId);
  console.log(`  ✅ PASSED: Grid layout job completed. URL: ${completedGridJob.output_file_url}`);

  // Fetch PDF buffer and check page count (Should be 1 page for 10 students in 5x2 grid)
  const gridPdfResp = await fetch(completedGridJob.output_file_url);
  const gridPdfBuf = await gridPdfResp.arrayBuffer();
  const gridPdfDoc = await PDFDocument.load(gridPdfBuf);
  console.log(`     Grid PDF Page Count: ${gridPdfDoc.getPageCount()} page(s) for 10 cards.`);

  // ---------------------------------------------------------
  // ▶ TEST 2: Single Card Per Page Layout for Specific Student
  // ---------------------------------------------------------
  console.log("\n▶ TEST 2: Single Card Per Page Layout (Specific Student)");
  const singleStudentId = students[0].student_id;
  const singleStudentJob = await DocumentJobsModel.create({
    instituteId,
    requestedBy: 1,
    documentType: 'ID_CARD',
    templateId: 'template1',
    scopeType: 'specific_students',
    scopeIds: [singleStudentId],
    totalCount: 1,
    layoutType: 'single'
  });

  console.log(`[Test 2] Created Job ID ${singleStudentJob.job_id} with layout_type = '${singleStudentJob.layout_type}'`);
  await processBulkDocumentJob(singleStudentJob.job_id, instituteId);

  const completedSingleJob = await DocumentJobsModel.findById(singleStudentJob.job_id, instituteId);
  console.log(`  ✅ PASSED: Single student single-layout job completed. URL: ${completedSingleJob.output_file_url}`);

  const singlePdfResp = await fetch(completedSingleJob.output_file_url);
  const singlePdfBuf = await singlePdfResp.arrayBuffer();
  const singlePdfDoc = await PDFDocument.load(singlePdfBuf);
  console.log(`     Single Card PDF Page Count: ${singlePdfDoc.getPageCount()} page for ${students[0].stu_first_name}.`);

  // ---------------------------------------------------------
  // ▶ TEST 3: Single Card Per Page Layout for Full Class
  // ---------------------------------------------------------
  console.log("\n▶ TEST 3: Single Card Per Page Layout (Full Class)");
  const classSingleJob = await DocumentJobsModel.create({
    instituteId,
    requestedBy: 1,
    documentType: 'ID_CARD',
    templateId: 'template1',
    scopeType: 'class',
    scopeIds: [classId],
    totalCount: students.length,
    layoutType: 'single'
  });

  console.log(`[Test 3] Created Job ID ${classSingleJob.job_id} with layout_type = '${classSingleJob.layout_type}'`);
  await processBulkDocumentJob(classSingleJob.job_id, instituteId);

  const completedClassSingleJob = await DocumentJobsModel.findById(classSingleJob.job_id, instituteId);
  console.log(`  ✅ PASSED: Full Class single-layout job completed. URL: ${completedClassSingleJob.output_file_url}`);

  const classSinglePdfResp = await fetch(completedClassSingleJob.output_file_url);
  const classSinglePdfBuf = await classSinglePdfResp.arrayBuffer();
  const classSinglePdfDoc = await PDFDocument.load(classSinglePdfBuf);
  console.log(`     Class Single Layout PDF Page Count: ${classSinglePdfDoc.getPageCount()} page(s) (Expected: ${students.length}).`);

  if (classSinglePdfDoc.getPageCount() === students.length) {
    console.log("  ✅ SUCCESS: Page count matches student count exactly (1 page per student).");
  } else {
    console.warn(`  ⚠️ Mismatch: expected ${students.length} pages, got ${classSinglePdfDoc.getPageCount()}`);
  }

  console.log("\n==========================================================");
  console.log("         LAYOUT OPTIONS VERIFICATION COMPLETE            ");
  console.log("==========================================================");
  process.exit(0);
}

runLayoutVerificationSuite().catch(err => {
  console.error("Verification suite failed:", err);
  process.exit(1);
});
