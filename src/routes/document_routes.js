import { Router } from "express";
import { DocumentController } from "../controllers/document_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";

const router = Router();

// GET PDF download endpoints
router.get("/id-card/:studentId", authMiddleware, DocumentController.generateIdCard);
router.get('/bonafide/:studentId', authMiddleware, DocumentController.generateBonafide);
router.get('/mark-sheet/:studentId', authMiddleware, DocumentController.generateMarkSheet);
router.get('/general-certificate/:studentId', authMiddleware, DocumentController.generateGeneralCertificate);
router.get('/timetable/:classId', authMiddleware, DocumentController.generateTimetable);

// POST Bulk generation endpoints
router.post('/id-card/bulk', authMiddleware, DocumentController.generateBulkIdCards);
router.post('/bonafide/bulk', authMiddleware, DocumentController.generateBulkBonafide);

// GET Document history
router.get('/history/:student_id', authMiddleware, DocumentController.getDocumentHistory);
router.get('/preview/:type/:templateId', authMiddleware, DocumentController.previewTemplate);

export default router;
