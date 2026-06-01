import { Router } from "express";
import { DocumentController } from "../controllers/document_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";

const router = Router();

// GET PDF download endpoints
router.get("/id-card/:studentId", authMiddleware, DocumentController.generateIdCard);
router.get('/bonafide/:studentId', authMiddleware, DocumentController.generateBonafide);
router.get('/leaving-certificate/:studentId', authMiddleware, DocumentController.generateLeavingCertificate);
router.get('/mark-sheet/:studentId', authMiddleware, DocumentController.generateMarkSheet);
router.get('/general-certificate/:studentId', authMiddleware, DocumentController.generateGeneralCertificate);
router.get('/timetable/:classId', authMiddleware, DocumentController.generateTimetable);
router.get('/fee-receipt/:paymentId', authMiddleware, DocumentController.generateFeeReceipt);
router.get('/attendance-report/:classId/:year/:month', authMiddleware, DocumentController.generateMonthlyAttendancePDF);

// POST Bulk generation endpoints
router.post('/id-card/bulk', authMiddleware, DocumentController.generateBulkIdCards);
router.post('/bonafide/bulk', authMiddleware, DocumentController.generateBulkBonafide);
router.post('/leaving-certificate/bulk', authMiddleware, DocumentController.generateBulkLeavingCertificates);
router.post('/general-certificate/bulk', authMiddleware, DocumentController.generateBulkGeneralCertificates);
router.post('/mark-sheet/bulk', authMiddleware, DocumentController.generateBulkMarkSheets);
router.post('/fee-receipt/bulk', authMiddleware, DocumentController.generateBulkFeeReceipts);

// GET Document history
router.get('/history/:student_id', authMiddleware, DocumentController.getDocumentHistory);
router.get('/preview/:type/:templateId', authMiddleware, DocumentController.previewTemplate);

export default router;
