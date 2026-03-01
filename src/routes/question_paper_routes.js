// src/routes/question_paper_routes.js
import { Router } from "express";
import QuestionPaperController from "../controllers/question_paper_controller.js";

const router = Router();

router.post("/", QuestionPaperController.savePaper);
router.get("/exam/:exam_id", QuestionPaperController.getPaperByExam);

export default router;
