import { DocumentJobsModel } from '../models/document_jobs_model.js';
import { processBulkDocumentJob } from '../services/bulk_document_worker.js';
import pool from '../config/db.js';
import { cloudinary } from '../config/cloudinary.js';
import { PDFDocument } from 'pdf-lib';

// Valid enum values & aliases
const DOC_TYPE_MAP = {
  'id_card': 'ID_CARD',
  'idcard': 'ID_CARD',
  'id_cards': 'ID_CARD',
  'id-card': 'ID_CARD',
  'bonafide': 'BONAFIDE',
  'bonafide_certificate': 'BONAFIDE',
  'certificate': 'CERTIFICATE',
  'general_certificate': 'CERTIFICATE',
  'achievement_certificate': 'CERTIFICATE'
};

const SCOPE_TYPE_MAP = {
  'whole_school': 'whole_school',
  'school': 'whole_school',
  'all': 'whole_school',
  'class': 'class',
  'class_wise': 'class',
  'specific_students': 'specific_students',
  'students': 'specific_students',
  'student': 'specific_students'
};

export const BulkDocumentController = {

  /**
   * POST /api/bulk-documents/generate
   * Request Body options:
   *   { document_type: "id_card", scope_type: "whole_school", scope_value: null }
   *   { document_type: "bonafide", scope_type: "class", scope_value: [10] }
   *   { document_type: "certificate", scope_type: "specific_students", scope_value: [101, 102] }
   */
  async createJob(req, res) {
    try {
      const rawDocType = req.body.document_type || req.body.documentType;
      const rawScopeType = req.body.scope_type || req.body.scopeType;
      const rawScopeVal = req.body.scope_value !== undefined ? req.body.scope_value : req.body.scopeIds;
      const templateId = req.body.template_id || req.body.templateId || null;
      const rawLayoutType = req.body.layout_type || req.body.layoutType;
      const layoutType = (String(rawLayoutType).toLowerCase() === 'single') ? 'single' : 'grid';

      const { user_id, role_id } = req.user;
      const instituteId = req.instituteId;

      // ── Normalize document type ──
      const documentType = rawDocType ? DOC_TYPE_MAP[String(rawDocType).toLowerCase()] || String(rawDocType).toUpperCase() : null;
      if (!documentType || !['ID_CARD', 'BONAFIDE', 'CERTIFICATE'].includes(documentType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid document_type. Allowed: 'id_card', 'bonafide', 'certificate'`
        });
      }

      // ── Normalize scope type ──
      const scopeType = rawScopeType ? SCOPE_TYPE_MAP[String(rawScopeType).toLowerCase()] : null;
      if (!scopeType) {
        return res.status(400).json({
          success: false,
          message: `Invalid scope_type. Allowed: 'whole_school', 'class', 'specific_students'`
        });
      }

      // ── Normalize scope IDs / values ──
      let scopeIds = [];
      if (rawScopeVal !== null && rawScopeVal !== undefined) {
        scopeIds = Array.isArray(rawScopeVal) ? rawScopeVal.map(Number) : [Number(rawScopeVal)];
      }

      if (scopeType === 'class' && scopeIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Class scope requires class ID(s) in scope_value'
        });
      }

      if (scopeType === 'specific_students' && scopeIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Specific students scope requires an array of student IDs in scope_value'
        });
      }

      // ── Access Control & Authorization ──
      // Whole School scope is restricted to Admins & Master Admins (roles 1, 2)
      if (scopeType === 'whole_school' && ![1, 2].includes(Number(role_id))) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Only School Admins and Master Admins can trigger Whole School bulk document generation'
        });
      }

      // Teachers / Staff (roles 3, 4, 5): Restrict to assigned classes
      if ([3, 4, 5].includes(Number(role_id))) {
        const staffRes = await pool.query(
          `SELECT c.class_id FROM class c
           JOIN staff st ON st.staff_id = c.staff_id
           WHERE st.user_id = $1`,
          [user_id]
        );
        const assignedClassIds = staffRes.rows.map(r => Number(r.class_id));

        if (scopeType === 'class') {
          const unauthorized = scopeIds.filter(id => !assignedClassIds.includes(id));
          if (unauthorized.length > 0) {
            return res.status(403).json({
              success: false,
              message: 'Forbidden: You can only generate documents for your assigned classes'
            });
          }
        }

        if (scopeType === 'specific_students') {
          const countRes = await pool.query(
            `SELECT COUNT(*) FROM student s
             JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
             WHERE s.student_id = ANY($1) AND ce.class_id != ALL($2)`,
            [scopeIds, assignedClassIds]
          );
          if (parseInt(countRes.rows[0].count, 10) > 0) {
            return res.status(403).json({
              success: false,
              message: 'Forbidden: One or more selected students are not in your assigned class'
            });
          }
        }
      }

      // ── Calculate initial student estimate ──
      let totalEstimate = 0;
      if (scopeType === 'whole_school') {
        const countRes = await pool.query(
          `SELECT COUNT(DISTINCT s.student_id)
           FROM student s
           INNER JOIN "user" u ON u.user_id = s.student_user_id
           INNER JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
           WHERE s.is_deleted = FALSE AND u.institute_id = $1`,
          [instituteId]
        );
        totalEstimate = parseInt(countRes.rows[0].count, 10);
      } else if (scopeType === 'class') {
        const countRes = await pool.query(
          `SELECT COUNT(DISTINCT s.student_id)
           FROM student s
           INNER JOIN "user" u ON u.user_id = s.student_user_id
           INNER JOIN class_enrollment ce ON ce.student_id = s.student_id AND ce.status_id = 1
           WHERE s.is_deleted = FALSE AND u.institute_id = $1 AND ce.class_id = ANY($2)`,
          [instituteId, scopeIds]
        );
        totalEstimate = parseInt(countRes.rows[0].count, 10);
      } else {
        totalEstimate = scopeIds.length;
      }

      if (totalEstimate === 0) {
        return res.status(400).json({
          success: false,
          message: 'No active enrolled students found for the selected scope'
        });
      }

      // ── Create Job ──
      const job = await DocumentJobsModel.create({
        instituteId,
        requestedBy: user_id,
        documentType,
        templateId,
        scopeType,
        scopeIds,
        totalCount: totalEstimate,
        layoutType
      });

      // ── Dispatch Async Worker ──
      setImmediate(() => {
        processBulkDocumentJob(job.job_id, instituteId).catch(err => {
          console.error(`[BulkDocumentController] Background worker error for job ${job.job_id}:`, err);
        });
      });

      return res.status(202).json({
        success: true,
        message: "Bulk generation job created successfully",
        data: {
          jobId: job.job_id,
          status: 'queued',
          documentType: job.document_type,
          scopeType: job.scope_type,
          totalCount: totalEstimate,
          createdAt: job.created_at
        }
      });
    } catch (err) {
      console.error('[BulkDocumentController] createJob error:', err);
      return res.status(500).json({ success: false, message: 'Error creating bulk generation job' });
    }
  },

  /**
   * GET /api/bulk-documents/:jobId/status
   */
  async getJobStatus(req, res) {
    try {
      const { jobId } = req.params;
      const instituteId = req.instituteId;

      const job = await DocumentJobsModel.findById(jobId, instituteId);
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      return res.json({
        success: true,
        data: {
          jobId: job.job_id,
          documentType: job.document_type,
          scopeType: job.scope_type,
          status: job.status,
          progressCount: job.progress_count,
          totalCount: job.total_count,
          outputFileUrl: job.output_file_url,
          fileSizeBytes: job.file_size_bytes,
          skippedStudents: job.skipped_students || [],
          errorMessage: job.error_message,
          createdAt: job.created_at,
          completedAt: job.completed_at
        }
      });
    } catch (err) {
      console.error('[BulkDocumentController] getJobStatus error:', err);
      return res.status(500).json({ success: false, message: 'Error fetching job status' });
    }
  },

  /**
   * GET /api/bulk-documents/history
   */
  async getJobHistory(req, res) {
    try {
      const instituteId = req.instituteId;
      const { status, limit = 20, offset = 0 } = req.query;

      const jobs = await DocumentJobsModel.listByInstitute(instituteId, {
        status: status || null,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      return res.json({ success: true, data: jobs });
    } catch (err) {
      console.error('[BulkDocumentController] getJobHistory error:', err);
      return res.status(500).json({ success: false, message: 'Error fetching job history' });
    }
  },

  /**
   * GET /api/bulk-documents/:jobId/download
   * Stream PDF directly with Content-Type: application/pdf header so browsers render/download cleanly.
   */
  /**
   * GET /api/bulk-documents/:jobId/download
   * Stream PDF directly with Content-Type: application/pdf header so browsers render/download cleanly.
   */
  async downloadFile(req, res) {
    try {
      const { jobId } = req.params;
      const instituteId = req.instituteId;

      const job = await DocumentJobsModel.findById(jobId, instituteId);
      if (!job || !job.output_file_url) {
        return res.status(404).json({ success: false, message: 'File not found or generation not completed' });
      }

      let fetchUrl = job.output_file_url;
      if (job.output_file_url.includes('cloudinary.com')) {
        const parts = job.output_file_url.split('/raw/upload/');
        if (parts.length > 1) {
          const pathWithVersion = parts[1];
          const publicId = pathWithVersion.replace(/^v\d+\//, '');
          fetchUrl = cloudinary.utils.private_download_url(
            publicId,
            '',
            { resource_type: 'raw', type: 'upload', attachment: false }
          );
        }
      }

      const fileResp = await fetch(fetchUrl);
      if (!fileResp.ok) {
        console.error(`[downloadFile] Cloudinary fetch failed for job ${jobId}. Status: ${fileResp.status}`);
        return res.status(502).json({ success: false, message: 'Failed to fetch file from storage' });
      }

      const arrayBuffer = await fileResp.arrayBuffer();
      let buffer = Buffer.from(arrayBuffer);

      // Build clean human-readable title and filename
      let docTypeLabel = 'Document';
      const normType = String(job.document_type || '').toUpperCase();
      if (normType === 'ID_CARD') docTypeLabel = 'Student ID Cards';
      else if (normType === 'BONAFIDE') docTypeLabel = 'Bonafide Certificate';
      else if (normType === 'CERTIFICATE' || normType === 'GENERAL_CERTIFICATE') docTypeLabel = 'Certificate of Recognition';

      let scopeLabel = '';
      if (job.scope_type === 'whole_school') {
        scopeLabel = 'Whole School';
      } else if (job.scope_type === 'class' && Array.isArray(job.scope_ids) && job.scope_ids.length > 0) {
        try {
          const classRes = await pool.query(
            `SELECT class_name, section_name FROM class WHERE class_id = $1`,
            [job.scope_ids[0]]
          );
          if (classRes.rows[0]) {
            const c = classRes.rows[0];
            scopeLabel = `Class ${c.class_name}${c.section_name ? '-' + c.section_name : ''}`;
          } else {
            scopeLabel = `Class ${job.scope_ids[0]}`;
          }
        } catch (e) {
          scopeLabel = `Class ${job.scope_ids[0]}`;
        }
      } else if (job.scope_type === 'specific_students' && Array.isArray(job.scope_ids) && job.scope_ids.length > 0) {
        if (job.scope_ids.length === 1) {
          try {
            const studentRes = await pool.query(
              `SELECT stu_first_name, stu_last_name FROM student WHERE student_id = $1`,
              [job.scope_ids[0]]
            );
            if (studentRes.rows[0]) {
              const s = studentRes.rows[0];
              scopeLabel = `${s.stu_first_name || ''} ${s.stu_last_name || ''}`.trim();
            }
          } catch (e) {}
        }
        if (!scopeLabel) {
          scopeLabel = `${job.scope_ids.length} Students`;
        }
      }

      let layoutLabel = '';
      if (normType === 'ID_CARD') {
        layoutLabel = (job.layout_type === 'single') ? '(Single Card)' : '(Grid)';
      }

      const titleParts = [docTypeLabel];
      if (scopeLabel) titleParts.push(scopeLabel);
      if (layoutLabel) titleParts.push(layoutLabel);

      const humanTitle = titleParts.join(' - ');
      const safeFilename = humanTitle.replace(/[^a-zA-Z0-9\-\_\.\(\)\s]/g, '').replace(/\s+/g, '_') + '.pdf';

      // Set PDF Metadata Title so browser viewer tabs display humanTitle instead of 'download'
      try {
        const pdfDoc = await PDFDocument.load(buffer);
        pdfDoc.setTitle(humanTitle);
        const updatedBytes = await pdfDoc.save();
        buffer = Buffer.from(updatedBytes);
      } catch (pdfErr) {
        console.warn('[downloadFile] Could not update PDF metadata title:', pdfErr.message);
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    } catch (err) {
      console.error('[BulkDocumentController] downloadFile error:', err);
      return res.status(500).json({ success: false, message: 'Error downloading document file' });
    }
  }
};
