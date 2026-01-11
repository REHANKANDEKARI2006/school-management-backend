import { Router } from "express";
import ExamsController from "../controllers/exams_controller.js";

const router = Router();

// Exams
router.post("/", ExamsController.createExam);
router.get("/", ExamsController.getAllExams);
router.put("/:id", ExamsController.updateExam);
router.delete("/:id", ExamsController.deleteExam);
router.post("/grades/:exam_id", ExamsController.addGrades);

// Exam Types
router.get("/types", ExamsController.getExamTypes);

export default router;
