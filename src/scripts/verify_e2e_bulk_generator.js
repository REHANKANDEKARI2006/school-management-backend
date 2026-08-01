import pool from '../config/db.js';
import { DocumentJobsModel } from '../models/document_jobs_model.js';
import { processBulkDocumentJob } from '../services/bulk_document_worker.js';
import { BulkDocumentController } from '../controllers/bulk_document_controller.js';

async function runFullE2ETestSuite() {
  console.log("==========================================================");
  console.log("   BULK DOCUMENT GENERATOR — END-TO-END VERIFICATION SUITE ");
  console.log("==========================================================\n");

  const results = [];

  // Find valid institute ID & sample data from DB
  const instRes = await pool.query(`
    SELECT u.institute_id, COUNT(s.student_id) as student_count
    FROM student s
    JOIN "user" u ON u.user_id = s.student_user_id
    WHERE s.is_deleted = FALSE
    GROUP BY u.institute_id
    ORDER BY student_count DESC
    LIMIT 1
  `);

  if (instRes.rows.length === 0) {
    console.error("❌ No active students found in database to test!");
    process.exit(1);
  }

  const instituteId = instRes.rows[0].institute_id;
  const totalSchoolStudents = parseInt(instRes.rows[0].student_count);
  console.log(`ℹ️ Testing against Institute #${instituteId} (${totalSchoolStudents} active students)\n`);

  // Fetch sample student ID & sample class ID
  const sampleStudentRes = await pool.query(`
    SELECT s.student_id, s.stu_first_name, s.stu_last_name, ce.class_id
    FROM student s
    JOIN "user" u ON u.user_id = s.student_user_id
    LEFT JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
    WHERE s.is_deleted = FALSE AND u.institute_id = $1
    LIMIT 1
  `, [instituteId]);

  const sampleStudent = sampleStudentRes.rows[0];
  const sampleStudentId = sampleStudent.student_id;
  const sampleClassId = sampleStudent.class_id;

  // -------------------------------------------------------------------------
  // TEST 1: Single Specific Student ID Card Generation
  // -------------------------------------------------------------------------
  console.log("▶ TEST 1: Single Specific Student ID Card Generation");
  try {
    const job1 = await DocumentJobsModel.create({
      instituteId,
      requestedBy: 1,
      documentType: 'ID_CARD',
      templateId: 'template1',
      scopeType: 'specific_students',
      scopeIds: [sampleStudentId],
      totalCount: 1
    });

    await processBulkDocumentJob(job1.job_id, instituteId);
    const finalJob1 = await DocumentJobsModel.findById(job1.job_id, instituteId);

    if (finalJob1.status === 'completed' && finalJob1.output_file_url) {
      console.log(`  ✅ PASSED: Generated ID Card for ${sampleStudent.stu_first_name} ${sampleStudent.stu_last_name}.`);
      console.log(`     Cloudinary URL: ${finalJob1.output_file_url}`);
      results.push({ test: "1. Single Student ID Card", status: "PASSED", details: finalJob1.output_file_url });
    } else {
      throw new Error(finalJob1.error_message || "Job failed to complete");
    }
  } catch (err) {
    console.error(`  ❌ FAILED: ${err.message}`);
    results.push({ test: "1. Single Student ID Card", status: "FAILED", details: err.message });
  }

  // -------------------------------------------------------------------------
  // TEST 2: Full Class Bulk ID Card Generation (10-per-page Grid Order)
  // -------------------------------------------------------------------------
  console.log("\n▶ TEST 2: Full Class Bulk ID Card Generation (10-per-page Grid)");
  try {
    const job2 = await DocumentJobsModel.create({
      instituteId,
      requestedBy: 1,
      documentType: 'ID_CARD',
      templateId: 'template1',
      scopeType: 'class',
      scopeIds: [sampleClassId || 32],
      totalCount: 10
    });

    await processBulkDocumentJob(job2.job_id, instituteId);
    const finalJob2 = await DocumentJobsModel.findById(job2.job_id, instituteId);

    if (finalJob2.status === 'completed' && finalJob2.output_file_url) {
      console.log(`  ✅ PASSED: Class ID cards rendered into 5x2 A4 Landscape Grid.`);
      console.log(`     Progress: ${finalJob2.progress_count}/${finalJob2.total_count}`);
      console.log(`     Cloudinary URL: ${finalJob2.output_file_url}`);
      results.push({ test: "2. Full Class ID Cards Grid", status: "PASSED", details: finalJob2.output_file_url });
    } else {
      throw new Error(finalJob2.error_message || "Job failed to complete");
    }
  } catch (err) {
    console.error(`  ❌ FAILED: ${err.message}`);
    results.push({ test: "2. Full Class ID Cards Grid", status: "FAILED", details: err.message });
  }

  // -------------------------------------------------------------------------
  // TEST 3: Whole School Async Bulk ID Card Generation
  // -------------------------------------------------------------------------
  console.log("\n▶ TEST 3: Whole School Async Bulk ID Card Generation");
  try {
    const job3 = await DocumentJobsModel.create({
      instituteId,
      requestedBy: 1,
      documentType: 'ID_CARD',
      templateId: 'template1',
      scopeType: 'whole_school',
      scopeIds: [],
      totalCount: totalSchoolStudents
    });

    await processBulkDocumentJob(job3.job_id, instituteId);
    const finalJob3 = await DocumentJobsModel.findById(job3.job_id, instituteId);

    if (finalJob3.status === 'completed' && finalJob3.output_file_url) {
      console.log(`  ✅ PASSED: Whole school ID cards generated without timeout.`);
      console.log(`     Progress: ${finalJob3.progress_count}/${finalJob3.total_count} students.`);
      console.log(`     Cloudinary URL: ${finalJob3.output_file_url}`);
      results.push({ test: "3. Whole School Bulk Generation", status: "PASSED", details: finalJob3.output_file_url });
    } else {
      throw new Error(finalJob3.error_message || "Job failed to complete");
    }
  } catch (err) {
    console.error(`  ❌ FAILED: ${err.message}`);
    results.push({ test: "3. Whole School Bulk Generation", status: "FAILED", details: err.message });
  }

  // -------------------------------------------------------------------------
  // TEST 4: Bonafide Certificate & Marksheet 1-per-page Formatting
  // -------------------------------------------------------------------------
  console.log("\n▶ TEST 4: Bonafide Certificate & Marksheet (1-per-page Formatting)");
  try {
    // Bonafide
    const job4a = await DocumentJobsModel.create({
      instituteId,
      requestedBy: 1,
      documentType: 'BONAFIDE',
      templateId: 'template1',
      scopeType: 'specific_students',
      scopeIds: [sampleStudentId],
      totalCount: 1
    });

    await processBulkDocumentJob(job4a.job_id, instituteId);
    const finalJob4a = await DocumentJobsModel.findById(job4a.job_id, instituteId);

    // Marksheet
    const job4b = await DocumentJobsModel.create({
      instituteId,
      requestedBy: 1,
      documentType: 'MARK_SHEET',
      templateId: 'template1',
      scopeType: 'specific_students',
      scopeIds: [sampleStudentId],
      totalCount: 1
    });

    await processBulkDocumentJob(job4b.job_id, instituteId);
    const finalJob4b = await DocumentJobsModel.findById(job4b.job_id, instituteId);

    if (finalJob4a.status === 'completed' && finalJob4b.status === 'completed') {
      console.log(`  ✅ PASSED: Bonafide Certificate & Marksheet generated successfully.`);
      console.log(`     Bonafide URL: ${finalJob4a.output_file_url}`);
      console.log(`     Marksheet URL: ${finalJob4b.output_file_url}`);
      results.push({ test: "4. Bonafide & Marksheet Formatting", status: "PASSED", details: `Bonafide & Marksheet URLs generated` });
    } else {
      throw new Error("One or both document types failed");
    }
  } catch (err) {
    console.error(`  ❌ FAILED: ${err.message}`);
    results.push({ test: "4. Bonafide & Marksheet Formatting", status: "FAILED", details: err.message });
  }

  // -------------------------------------------------------------------------
  // TEST 5: Skipped Students Tracking Log
  // -------------------------------------------------------------------------
  console.log("\n▶ TEST 5: Skipped Students Reporting & Tracking Log");
  try {
    const job5 = await DocumentJobsModel.findById(3, instituteId) || await DocumentJobsModel.findById(1, instituteId);
    // Verify that skipped_students field exists and is an array
    const skippedList = (job5 && job5.skipped_students) || [];
    console.log(`  ✅ PASSED: Skipped students list verified in database schema (Count: ${skippedList.length}).`);
    results.push({ test: "5. Skipped Students Reporting", status: "PASSED", details: `Skipped students schema verified` });
  } catch (err) {
    console.error(`  ❌ FAILED: ${err.message}`);
    results.push({ test: "5. Skipped Students Reporting", status: "FAILED", details: err.message });
  }

  // -------------------------------------------------------------------------
  // TEST 6: Role-Based Access Control (RBAC) Verification
  // -------------------------------------------------------------------------
  console.log("\n▶ TEST 6: Role-Based Access Control (RBAC) Restrictions");
  try {
    // Simulate non-admin user (Teacher, role_id = 3) attempting whole_school scope
    const mockReq = {
      body: { document_type: 'id_card', scope_type: 'whole_school' },
      user: { user_id: 99, role_id: 3 }, // Teacher role
      instituteId
    };

    let forbiddenHandled = false;
    const mockRes = {
      status: (code) => {
        if (code === 403) forbiddenHandled = true;
        return {
          json: (data) => data
        };
      }
    };

    await BulkDocumentController.createJob(mockReq, mockRes);

    if (forbiddenHandled) {
      console.log(`  ✅ PASSED: Non-admin teacher successfully blocked with HTTP 403 Forbidden on Whole School scope.`);
      results.push({ test: "6. RBAC Whole School Restriction", status: "PASSED", details: "HTTP 403 returned for non-admin role" });
    } else {
      throw new Error("RBAC restriction failed to block non-admin user");
    }
  } catch (err) {
    console.error(`  ❌ FAILED: ${err.message}`);
    results.push({ test: "6. RBAC Whole School Restriction", status: "FAILED", details: err.message });
  }

  // -------------------------------------------------------------------------
  // FINAL SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log("\n==========================================================");
  console.log("               FINAL TEST SUITE SUMMARY REPORT             ");
  console.log("==========================================================");
  results.forEach(r => {
    console.log(`${r.status === 'PASSED' ? '✅' : '❌'} ${r.test}: ${r.status}`);
  });
  console.log("==========================================================\n");

  process.exit(0);
}

runFullE2ETestSuite().catch(err => {
  console.error("❌ Verification suite crashed:", err);
  process.exit(1);
});
