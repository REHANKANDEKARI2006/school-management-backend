import { Router } from 'express';
import { BulkDocumentController } from '../controllers/bulk_document_controller.js';

const router = Router();

// POST - Create a bulk document generation job
router.post('/generate', BulkDocumentController.createJob);

// GET - Poll job status / progress
router.get('/:jobId/status', BulkDocumentController.getJobStatus);

// GET - Stream PDF file directly with application/pdf header
router.get('/:jobId/download', BulkDocumentController.downloadFile);

// GET - List recent bulk generation jobs
router.get('/history', BulkDocumentController.getJobHistory);

export default router;
