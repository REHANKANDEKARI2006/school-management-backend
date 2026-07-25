import { Router } from "express";
import ExamsController from "../controllers/exams_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";
import instituteMiddleware from "../middleware/institute_middleware.js";
import { allowRoles } from "../middleware/role_middleware.js";

const router = Router();

router.use(authMiddleware);
router.use(instituteMiddleware);

// ===================================================
// STATIC ROUTES — Must come BEFORE any /:param routes
// ===================================================
router.get("/types", allowRoles(1, 2, 3, 4, 5, 10, 11, 18, 20), ExamsController.getExamTypes);
router.get("/statuses", allowRoles(1, 2, 3, 4, 5, 10, 11, 18, 20), ExamsController.getExamStatuses);

// GRADES — "grades" literal BEFORE /:id
router.post("/grades/:exam_id", allowRoles(1, 2, 3, 4), ExamsController.addGrades);
router.get("/grades/:exam_id", allowRoles(1, 2, 3, 4, 5, 18, 20), ExamsController.getGrades);
router.post("/bulk-grades/:exam_id", allowRoles(1, 2, 3, 4), ExamsController.addBulkGrades);

// ===================================================
// EXAMS CRUD
// ===================================================
router.post("/", allowRoles(1, 2, 3, 4), ExamsController.createExam);
router.get("/", allowRoles(1, 2, 3, 4, 5, 10, 11, 18, 20), ExamsController.getAllExams);
router.get("/:id", allowRoles(1, 2, 3, 4, 5, 10, 11, 18, 20), ExamsController.getExamById);
router.put("/:id", allowRoles(1, 2, 3, 4), ExamsController.updateExam);
router.delete("/:id", allowRoles(1, 2), ExamsController.deleteExam);

export default router;
