import puppeteer from 'puppeteer';
import ejs from 'ejs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';
import { DocumentJobsModel } from '../models/document_jobs_model.js';
import { DocumentService } from './document_service.js';
import { StudentModel } from '../models/student_Model.js';
import { SchoolProfileModel } from '../models/school_profile_model.js';
import pool from '../config/db.js';
import { cloudinary } from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve a scope (whole_school | class | specific_students) into an array of student IDs.
 * Filters for active & enrolled students only.
 * Sorted by Class, Section, and Student Name for orderly document distribution.
 */
async function resolveStudentIds(scopeType, scopeIds, instituteId) {
  const normScope = scopeType.toLowerCase();

  if (normScope === 'whole_school' || normScope === 'school') {
    const { rows } = await pool.query(
      `SELECT s.student_id
       FROM student s
       INNER JOIN "user" u ON u.user_id = s.student_user_id
       LEFT JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
       LEFT JOIN class c ON c.class_id = ce.class_id
       LEFT JOIN section sec ON sec.section_id = c.section_id
       WHERE s.is_deleted = FALSE AND u.institute_id = $1
       ORDER BY c.class_name ASC NULLS LAST, sec.section_name ASC NULLS LAST, s.stu_first_name ASC, s.stu_last_name ASC`,
      [instituteId]
    );
    return rows.map(r => r.student_id);
  }

  if (normScope === 'class') {
    const ids = Array.isArray(scopeIds) ? scopeIds : [scopeIds];
    const { rows } = await pool.query(
      `SELECT s.student_id
       FROM student s
       INNER JOIN "user" u ON u.user_id = s.student_user_id
       LEFT JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
       LEFT JOIN class c ON c.class_id = ce.class_id
       LEFT JOIN section sec ON sec.section_id = c.section_id
       WHERE s.is_deleted = FALSE AND u.institute_id = $1 AND ce.class_id = ANY($2)
       ORDER BY c.class_name ASC NULLS LAST, sec.section_name ASC NULLS LAST, s.stu_first_name ASC, s.stu_last_name ASC`,
      [instituteId, ids]
    );
    return rows.map(r => r.student_id);
  }

  if (normScope === 'specific_students' || normScope === 'students') {
    const ids = Array.isArray(scopeIds) ? scopeIds : [scopeIds];
    const { rows } = await pool.query(
      `SELECT s.student_id
       FROM student s
       INNER JOIN "user" u ON u.user_id = s.student_user_id
       LEFT JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
       LEFT JOIN class c ON c.class_id = ce.class_id
       LEFT JOIN section sec ON sec.section_id = c.section_id
       WHERE s.is_deleted = FALSE AND u.institute_id = $1 AND s.student_id = ANY($2)
       ORDER BY c.class_name ASC NULLS LAST, sec.section_name ASC NULLS LAST, s.stu_first_name ASC, s.stu_last_name ASC`,
      [instituteId, ids]
    );
    return rows.map(r => r.student_id);
  }

  throw new Error(`Unknown scope type: ${scopeType}`);
}

/**
 * Fetch full student data needed for document generation.
 */
async function fetchStudentsForDocuments(studentIds, instituteId) {
  if (!studentIds || studentIds.length === 0) return [];

  const { rows } = await pool.query(
    `SELECT
       s.student_id, s.student_user_id,
       s.stu_first_name, s.stu_last_name,
       s.email, s.date_of_birth, s.profile_url,
       s.address, s.student_id AS admission_no,
       s.joined_date,
       bg.blood_group AS blood_group,
       c.class_id, c.class_name,
       sec.section_name,
       g.grdn_first_name AS father_name,
       g.grdn_last_name AS mother_name,
       g.phone AS primary_contact,
       u.institute_id
     FROM student s
     INNER JOIN "user" u ON u.user_id = s.student_user_id
     LEFT JOIN blood_group bg ON bg.bg_id = s.bg_id
     LEFT JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
     LEFT JOIN class c ON c.class_id = ce.class_id
     LEFT JOIN section sec ON sec.section_id = c.section_id
     LEFT JOIN guardian g ON g.student_id = s.student_id
     WHERE s.student_id = ANY($1) AND u.institute_id = $2
     ORDER BY c.class_name ASC NULLS LAST, sec.section_name ASC NULLS LAST, s.stu_first_name ASC, s.stu_last_name ASC`,
    [studentIds, instituteId]
  );
  return rows;
}

/**
 * Upload a PDF buffer to Cloudinary.
 */
async function uploadToCloudinary(pdfBuffer, fileName) {
  const cleanPublicId = `${Date.now()}_${fileName.replace(/\.pdf$/i, '')}`;
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'bulk_documents',
        resource_type: 'raw',
        public_id: cleanPublicId,
        type: 'upload',
        access_mode: 'public',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(pdfBuffer);
  });
}

/**
 * Generate bulk ID cards using the grid layout (10 cards per A4 landscape page).
 */
async function generateBulkIdCardsGrid(students, schoolProfile, userId, jobId, instituteId) {
  let browser = null;
  const skippedStudents = [];

  try {
    if (!schoolProfile.logo_url || !schoolProfile.school_name) {
      console.warn(`[BulkWorker] Job ${jobId}: School profile missing primary branding elements`);
    }

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--no-first-run']
    });

    const [logoDataUrl, signatureDataUrl] = await Promise.all([
      DocumentService._fetchImageAsBase64(schoolProfile.logo_url),
      DocumentService._fetchImageAsBase64(schoolProfile.signature_url),
    ]);

    const mergedPdf = await PDFDocument.create();
    const BATCH_SIZE = 10; // Cards per page
    let processedCount = 0;

    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const batch = students.slice(i, i + BATCH_SIZE);

      const photoDataUrls = {};
      const qrDataUrls = {};

      await Promise.all(
        batch.map(async (stu) => {
          if (stu.profile_url) {
            const dataUrl = await DocumentService._fetchImageAsBase64(stu.profile_url);
            if (dataUrl) photoDataUrls[stu.student_id] = dataUrl;
          } else {
            skippedStudents.push({
              student_id: stu.student_id,
              student_name: `${stu.stu_first_name} ${stu.stu_last_name}`,
              reason: 'Missing student photo (used silhouette placeholder)'
            });
          }

          const qrText = String(stu.admission_no || stu.student_id || '0000');
          try {
            qrDataUrls[stu.student_id] = await QRCode.toDataURL(qrText, {
              margin: 1,
              width: 120,
              errorCorrectionLevel: 'M'
            });
          } catch (qrErr) {
            console.warn(`[BulkWorker] QR generation failed for student ${stu.student_id}:`, qrErr.message);
          }
        })
      );

      const templatePath = path.join(__dirname, '..', 'templates', 'id-card', 'grid-layout.ejs');
      const html = await ejs.renderFile(templatePath, {
        students: batch,
        school: schoolProfile,
        logoDataUrl,
        signatureDataUrl,
        photoDataUrls,
        qrDataUrls,
        cardStartIndex: i + 1
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      });

      await page.close();

      const pageDoc = await PDFDocument.load(pdfBuffer);
      const copiedPages = await mergedPdf.copyPages(pageDoc, pageDoc.getPageIndices());
      copiedPages.forEach(p => mergedPdf.addPage(p));

      processedCount += batch.length;
      await DocumentJobsModel.updateProgress(jobId, processedCount);
    }

    await DocumentService._safeBrowserClose(browser);
    return {
      pdfBuffer: Buffer.from(await mergedPdf.save()),
      skippedStudents
    };
  } catch (err) {
    await DocumentService._safeBrowserClose(browser);
    throw err;
  }
}

/**
 * Generate bulk bonafide certificates or mark sheets.
 * Renders 1 document per A4 page per student.
 * Captures skipped students (e.g. error rendering specific student) without failing whole batch.
 */
async function generateBulkDocumentsByType(documentType, studentIds, userId, templateId, jobId, instituteId) {
  let browser = null;
  const skippedStudents = [];

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--no-first-run']
    });

    const mergedPdf = await PDFDocument.create();
    let processedCount = 0;

    for (const studentId of studentIds) {
      try {
        let pdfBuffer;
        const normDocType = documentType.toUpperCase();

        if (normDocType === 'BONAFIDE') {
          pdfBuffer = await DocumentService.generateBonafide(studentId, userId, templateId, browser, instituteId);
        } else if (normDocType === 'CERTIFICATE' || normDocType === 'GENERAL_CERTIFICATE') {
          pdfBuffer = await DocumentService.generateGeneralCertificate(studentId, userId, templateId, browser, instituteId);
        } else {
          throw new Error(`Unsupported document type: ${documentType}`);
        }

        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach(p => mergedPdf.addPage(p));
      } catch (err) {
        console.error(`[BulkWorker] Error generating ${documentType} for student ${studentId}:`, err.message);
        
        // Fetch student name for skipped list log
        let sName = `Student #${studentId}`;
        try {
          const sObj = await StudentModel.findById(studentId, instituteId);
          if (sObj) sName = `${sObj.stu_first_name || ''} ${sObj.stu_last_name || ''}`.trim();
        } catch (e) {}

        skippedStudents.push({
          student_id: studentId,
          student_name: sName,
          reason: err.message || 'Error generating document'
        });
      }

      processedCount++;

      // Update progress every 5 students (or every student if total < 50)
      if (processedCount % 5 === 0 || processedCount === studentIds.length || studentIds.length < 50) {
        await DocumentJobsModel.updateProgress(jobId, processedCount);
      }
    }

    await DocumentService._safeBrowserClose(browser);

    if (mergedPdf.getPageCount() === 0) {
      throw new Error('No documents were generated — all students in this request failed');
    }

    return {
      pdfBuffer: Buffer.from(await mergedPdf.save()),
      skippedStudents
    };
  } catch (err) {
    await DocumentService._safeBrowserClose(browser);
    throw err;
  }
}

/**
 * Generate bulk ID cards with 1 card per page (Single Card Layout).
 * Reuses DocumentService.generateIdCard to maintain 100% visual consistency with single generation.
 */
async function generateBulkIdCardsSingle(studentIds, userId, templateId, jobId, instituteId) {
  let browser = null;
  const skippedStudents = [];

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--disable-gpu', '--no-first-run']
    });

    const mergedPdf = await PDFDocument.create();
    let processedCount = 0;

    for (const studentId of studentIds) {
      try {
        const pdfBuffer = await DocumentService.generateIdCard(studentId, userId, templateId, browser, instituteId);
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach(p => mergedPdf.addPage(p));
      } catch (err) {
        console.error(`[BulkWorker] Error generating single ID card for student ${studentId}:`, err.message);

        let sName = `Student #${studentId}`;
        try {
          const sObj = await StudentModel.findById(studentId, instituteId);
          if (sObj) sName = `${sObj.stu_first_name || ''} ${sObj.stu_last_name || ''}`.trim();
        } catch (e) {}

        skippedStudents.push({
          student_id: studentId,
          student_name: sName,
          reason: err.message || 'Error generating ID card'
        });
      }

      processedCount++;

      if (processedCount % 5 === 0 || processedCount === studentIds.length || studentIds.length < 50) {
        await DocumentJobsModel.updateProgress(jobId, processedCount);
      }
    }

    await DocumentService._safeBrowserClose(browser);

    if (mergedPdf.getPageCount() === 0) {
      throw new Error('No ID cards were generated — all students in this request failed');
    }

    return {
      pdfBuffer: Buffer.from(await mergedPdf.save()),
      skippedStudents
    };
  } catch (err) {
    await DocumentService._safeBrowserClose(browser);
    throw err;
  }
}

/**
 * Main background worker function.
 */
export async function processBulkDocumentJob(jobId, instituteId) {
  console.log(`[BulkWorker] Starting job ${jobId}...`);

  try {
    await DocumentJobsModel.markProcessing(jobId);

    const job = await DocumentJobsModel.findById(jobId, instituteId);
    if (!job) throw new Error('Job not found');

    const studentIds = await resolveStudentIds(job.scope_type, job.scope_ids, instituteId);
    if (studentIds.length === 0) {
      throw new Error('No active students found for the selected scope');
    }

    await pool.query(
      `UPDATE document_jobs SET total_count = $2, updated_at = NOW() WHERE job_id = $1`,
      [jobId, studentIds.length]
    );

    let result;
    const schoolProfile = await SchoolProfileModel.getProfile(instituteId);
    const normDocType = job.document_type.toUpperCase();

    if (normDocType === 'ID_CARD') {
      if (job.layout_type === 'single') {
        console.log(`[BulkWorker] Job ${jobId}: Generating Single Card Per Page layout...`);
        result = await generateBulkIdCardsSingle(studentIds, job.requested_by, job.template_id, jobId, instituteId);
      } else {
        console.log(`[BulkWorker] Job ${jobId}: Generating 10-per-page Grid layout...`);
        const students = await fetchStudentsForDocuments(studentIds, instituteId);
        result = await generateBulkIdCardsGrid(students, schoolProfile, job.requested_by, jobId, instituteId);
      }
    } else {
      result = await generateBulkDocumentsByType(
        job.document_type, studentIds, job.requested_by, job.template_id, jobId, instituteId
      );
    }

    const { pdfBuffer, skippedStudents } = result;

    const docTypeLabel = job.document_type.toLowerCase().replace(/_/g, '-');
    const scopeLabel = job.scope_type.toLowerCase().replace(/_/g, '-');
    const fileName = `Bulk_${docTypeLabel}_${scopeLabel}_${Date.now()}.pdf`;

    console.log(`[BulkWorker] Job ${jobId}: Uploading ${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB to Cloudinary...`);
    const fileUrl = await uploadToCloudinary(pdfBuffer, fileName);

    await DocumentJobsModel.markCompleted(jobId, fileUrl, pdfBuffer.length, skippedStudents);
    console.log(`[BulkWorker] Job ${jobId} completed successfully. URL: ${fileUrl}`);

    try {
      const { DashboardService } = await import('./dashboard_service.js');
      await DashboardService.addActivityEntry(
        job.requested_by,
        'bulk_doc_gen',
        `Bulk ${job.document_type} generated for ${studentIds.length} students (${job.scope_type} scope)`,
        instituteId
      );
    } catch (e) { console.error('[BulkWorker] Activity log error:', e.message); }

  } catch (err) {
    console.error(`[BulkWorker] Job ${jobId} FAILED:`, err.message);
    await DocumentJobsModel.markFailed(jobId, err.message).catch(e => {
      console.error('[BulkWorker] Failed to mark job as failed:', e.message);
    });
  }
}
