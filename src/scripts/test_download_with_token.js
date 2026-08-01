import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

async function testDownloadWithToken() {
  console.log("Testing PDF download proxy with auth token...");

  // Generate test admin token
  const token = jwt.sign({ user_id: 1, role_id: 1, institute_id: 2 }, process.env.JWT_SECRET || 'secret');

  // Find a completed job
  const { rows } = await pool.query(`
    SELECT job_id, document_type
    FROM document_jobs
    WHERE status = 'completed' AND output_file_url IS NOT NULL
    ORDER BY job_id DESC
    LIMIT 1
  `);

  if (rows.length === 0) {
    console.error("No completed jobs in DB");
    process.exit(1);
  }

  const job = rows[0];
  console.log(`Downloading Job #${job.job_id} (${job.document_type})...`);

  const resp = await fetch(`http://localhost:5000/api/bulk-documents/${job.job_id}/download?token=${encodeURIComponent(token)}`);
  console.log("Download Proxy Response Status:", resp.status);
  console.log("Content-Type:", resp.headers.get('content-type'));
  console.log("Content-Disposition:", resp.headers.get('content-disposition'));
  console.log("Content-Length:", resp.headers.get('content-length'), "bytes");

  if (resp.status === 200 && resp.headers.get('content-type')?.includes('application/pdf')) {
    console.log("🎉 SUCCESS: Download proxy returned valid application/pdf document stream!");
  } else {
    console.error("❌ Download proxy test failed");
  }

  process.exit(0);
}

testDownloadWithToken().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
