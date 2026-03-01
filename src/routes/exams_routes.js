import { Router } from "express";
import ExamsController from "../controllers/exams_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";

const router = Router();

// Protect ALL exam routes
router.use(authMiddleware);

// ===================================================
// STATIC ROUTES — Must come BEFORE any /:param routes
// ===================================================
router.get("/types", ExamsController.getExamTypes);
router.get("/statuses", ExamsController.getExamStatuses);

// GRADES — "grades" literal BEFORE /:id
router.post("/grades/:exam_id", ExamsController.addGrades);
router.get("/grades/:exam_id", ExamsController.getGrades);
router.post("/bulk-grades/:exam_id", ExamsController.addBulkGrades);

// ===================================================
// EXAMS CRUD
// ===================================================
router.post("/", ExamsController.createExam);
router.get("/", ExamsController.getAllExams);
router.get("/:id", ExamsController.getExamById);
router.put("/:id", ExamsController.updateExam);
router.delete("/:id", ExamsController.deleteExam);

export default router;
