// src/routes/question_paper_routes.js
import { Router } from "express";
import QuestionPaperController from "../controllers/question_paper_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";
import instituteMiddleware from "../middleware/institute_middleware.js";
import { allowRoles } from "../middleware/role_middleware.js";

const router = Router();

router.use(authMiddleware);
router.use(instituteMiddleware);

// Basic CRUD
router.get("/", allowRoles(1, 2, 3, 4), QuestionPaperController.list);
router.get("/upcoming-exams", allowRoles(1, 2, 3, 4), QuestionPaperController.getUpcomingExams);
router.post("/draft", allowRoles(1, 2, 3, 4), QuestionPaperController.createDraft);
router.get("/:id", allowRoles(1, 2, 3, 4), QuestionPaperController.getById);
router.patch("/:id", allowRoles(1, 2, 3, 4), QuestionPaperController.updatePaper);
router.put("/:id/full-save", allowRoles(1, 2, 3, 4), QuestionPaperController.fullSave);
router.delete("/:id", allowRoles(1, 2, 3, 4), QuestionPaperController.deletePaper);
router.post("/:id/duplicate", allowRoles(1, 2, 3, 4), QuestionPaperController.duplicate);
router.post("/:id/publish", allowRoles(1, 2, 3, 4), QuestionPaperController.publishPaper);

// Sections & Questions
router.post("/:paper_id/sections", allowRoles(1, 2, 3, 4), QuestionPaperController.upsertSection);
router.delete("/sections/:section_id", allowRoles(1, 2, 3, 4), QuestionPaperController.deleteSection);
router.post("/sections/:section_id/questions", allowRoles(1, 2, 3, 4), QuestionPaperController.upsertQuestion);
router.delete("/questions/:question_id", allowRoles(1, 2, 3, 4), QuestionPaperController.deleteQuestion);

// PDF Generation
router.post("/:id/generate-pdf", allowRoles(1, 2, 3, 4, 18, 20), QuestionPaperController.generatePDF);

export default router;
