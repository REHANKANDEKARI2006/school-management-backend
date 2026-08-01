import pool from '../config/db.js';

async function checkJobs() {
  const { rows } = await pool.query(`
    SELECT job_id, document_type, status, output_file_url
    FROM document_jobs
    WHERE status = 'completed'
    ORDER BY job_id DESC
    LIMIT 5
  `);
  console.log("Recent Completed Jobs:", rows);

  for (const job of rows) {
    if (job.output_file_url) {
      const resp = await fetch(job.output_file_url);
      console.log(`Job #${job.job_id} direct Cloudinary status:`, resp.status, "Content-Type:", resp.headers.get('content-type'));
    }
  }

  process.exit(0);
}

checkJobs().catch(console.error);
