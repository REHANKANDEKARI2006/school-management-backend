// src/routes/question_paper_routes.js
import { Router } from "express";
import QuestionPaperController from "../controllers/question_paper_controller.js";

const router = Router();

// Basic CRUD
router.get("/", QuestionPaperController.list);
router.get("/upcoming-exams", QuestionPaperController.getUpcomingExams);
router.post("/draft", QuestionPaperController.createDraft);
router.get("/:id", QuestionPaperController.getById);
router.patch("/:id", QuestionPaperController.updatePaper);
router.delete("/:id", QuestionPaperController.deletePaper);
router.post("/:id/duplicate", QuestionPaperController.duplicate);
router.post("/:id/publish", QuestionPaperController.publishPaper);

// Sections & Questions
router.post("/:paper_id/sections", QuestionPaperController.upsertSection);
router.delete("/sections/:section_id", QuestionPaperController.deleteSection);
router.post("/sections/:section_id/questions", QuestionPaperController.upsertQuestion);
router.delete("/questions/:question_id", QuestionPaperController.deleteQuestion);

// PDF Generation
router.post("/:id/generate-pdf", QuestionPaperController.generatePDF);

export default router;
