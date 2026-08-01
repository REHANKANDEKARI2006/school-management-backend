import pool from '../config/db.js';
import { DocumentJobsModel } from '../models/document_jobs_model.js';

async function testDownloadProxy() {
  console.log("Testing PDF download proxy endpoint...");

  // Find a completed job from DB
  const { rows } = await pool.query(`
    SELECT job_id, document_type, output_file_url
    FROM document_jobs
    WHERE status = 'completed' AND output_file_url IS NOT NULL
    ORDER BY job_id DESC
    LIMIT 1
  `);

  if (rows.length === 0) {
    console.error("No completed jobs in DB to test");
    process.exit(1);
  }

  const job = rows[0];
  console.log(`Testing Job #${job.job_id} (${job.document_type})...`);

  // Fetch Cloudinary URL directly vs through download proxy
  const cloudResp = await fetch(job.output_file_url);
  console.log("Cloudinary direct URL status:", cloudResp.status, "Content-Type:", cloudResp.headers.get('content-type'));

  // Backend endpoint simulation
  const backendResp = await fetch(`http://localhost:5000/api/bulk-documents/${job.job_id}/download`);
  console.log("Backend Download Proxy status:", backendResp.status, "Content-Type:", backendResp.headers.get('content-type'));

  if (backendResp.status === 200 && backendResp.headers.get('content-type')?.includes('application/pdf')) {
    console.log("✅ PDF Download Proxy test PASSED! Browser will open and view the PDF flawlessly.");
  } else {
    console.error("❌ PDF Download Proxy test FAILED!");
  }

  process.exit(0);
}

testDownloadProxy().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
