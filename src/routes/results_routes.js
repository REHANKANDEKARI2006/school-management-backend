import { Router } from "express";
import ResultsController from "../controllers/results_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";
import { allowRoles } from "../middleware/role_middleware.js";

const router = Router();

// All result routes require authentication
router.use(authMiddleware);

// 1. Faculty portal - My Results list (Completed/exams list assigned to teacher)
router.get("/faculty/assigned", allowRoles(3, 4), ResultsController.getFacultyAssignedExams);

// 2. Admin dashboard - Subject entry completion list
router.get("/tracking", allowRoles(1, 2, 21), ResultsController.getResultsTracking);

// 3. Admin override - Unlock exam marks
router.post("/unlock/:exam_id", allowRoles(1, 2, 21), ResultsController.unlockExamMarks);

// 4. Admin - Generate results summaries
router.post("/generate", allowRoles(1, 2, 21), ResultsController.generateResults);

// 5. Admin - Publish results to students/parents
router.post("/publish", allowRoles(1, 2, 21), ResultsController.publishResults);

// 6. Student/Parent portal - View published results
router.get("/my-results", allowRoles(18, 20), ResultsController.getMyResults);

// 7. Admin - Preview generated results
router.get("/preview", allowRoles(1, 2, 21), ResultsController.previewResults);

// 8. Download marksheet PDF for a specific student and exam (students, parents, admins)
router.get("/marksheet/:student_id/:exam_name", allowRoles(1, 2, 3, 4, 5, 18, 20, 21), ResultsController.generateExamMarksheet);

export default router;
