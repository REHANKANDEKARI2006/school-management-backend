import pool from '../config/db.js';
import { DocumentJobsModel } from '../models/document_jobs_model.js';
import { PDFDocument } from 'pdf-lib';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

async function testDownloadTitle() {
  console.log("Testing PDF title metadata and filename headers on download endpoint...");

  const { rows } = await pool.query(
    `SELECT job_id, document_type, scope_type, scope_ids, layout_type, output_file_url
     FROM document_jobs
     WHERE status = 'completed' AND output_file_url IS NOT NULL
     ORDER BY job_id DESC LIMIT 1`
  );

  if (rows.length === 0) {
    console.log("No completed jobs found.");
    process.exit(0);
  }

  const job = rows[0];
  console.log(`ℹ️ Checking Job ID ${job.job_id} (${job.document_type}, ${job.scope_type})...`);

  const token = jwt.sign(
    { user_id: 1, role_id: 1, institute_id: 2 },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );
  const downloadUrl = `http://localhost:5000/api/bulk-documents/${job.job_id}/download?token=${token}`;

  const res = await fetch(downloadUrl);
  console.log(`Download Endpoint HTTP Status: ${res.status}`);
  console.log(`Content-Disposition Header: ${res.headers.get('content-disposition')}`);

  const arrayBuf = await res.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuf);
  console.log(`PDF Title Metadata in PDF file: "${pdfDoc.getTitle()}"`);

  if (pdfDoc.getTitle()) {
    console.log(`✅ SUCCESS: PDF Title Metadata is set to "${pdfDoc.getTitle()}" so browser tab displays this title!`);
  } else {
    console.warn("⚠️ PDF Title Metadata is empty.");
  }

  process.exit(0);
}

testDownloadTitle().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
