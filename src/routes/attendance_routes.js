import { Router } from "express";
import { AttendanceController } from "../controllers/attendance_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";
import instituteMiddleware from "../middleware/institute_middleware.js";
import { allowRoles } from "../middleware/role_middleware.js";

const router = Router();

router.use(authMiddleware);
router.use(instituteMiddleware);

/* DASHBOARD */
router.get("/dashboard", allowRoles(1, 2, 3, 4, 5, 10, 11), AttendanceController.getDashboard);

/* SESSION */
router.post("/session", allowRoles(1, 2, 3, 4, 5, 10, 11), AttendanceController.createSession);
router.get("/session/check", allowRoles(1, 2, 3, 4, 5, 10, 11), AttendanceController.checkSession);

/* RECORD */
router.post("/record", allowRoles(1, 2, 3, 4, 5, 10, 11), AttendanceController.createRecords);
router.put("/record", allowRoles(1, 2, 3, 4, 5, 10, 11), AttendanceController.updateRecord);

/* OTHERS */
router.get("/students", allowRoles(1, 2, 3, 4, 5, 10, 11), AttendanceController.getStudents);
router.get("/summary", allowRoles(1, 2, 3, 4, 5, 10, 11), AttendanceController.getSummary);

/* STUDENT HISTORY */
router.get("/student/:studentId", allowRoles(1, 2, 3, 4, 5, 10, 11, 18, 20), AttendanceController.getStudentHistory);
router.get("/my-history", allowRoles(1, 2, 3, 4, 5, 10, 11, 18, 20), AttendanceController.getMyHistory);

/* REPORTS */
router.get("/monthly-report", allowRoles(1, 2, 3, 4, 5, 10, 11), AttendanceController.getMonthlyReport);

export default router;
