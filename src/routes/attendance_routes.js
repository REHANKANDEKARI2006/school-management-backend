import { Router } from "express";
import { AttendanceController } from "../controllers/attendance_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";

const router = Router();

/* DASHBOARD */
router.get("/dashboard", AttendanceController.getDashboard);

/* SESSION */
router.post("/session", AttendanceController.createSession);
router.get("/session/check", AttendanceController.checkSession);

/* RECORD */
router.post("/record", AttendanceController.createRecords);
router.put("/record", AttendanceController.updateRecord);

/* OTHERS */
router.get("/students", AttendanceController.getStudents);
router.get("/summary", AttendanceController.getSummary);

/* STUDENT HISTORY */
router.get("/student/:studentId", AttendanceController.getStudentHistory);
router.get("/my-history", authMiddleware, AttendanceController.getMyHistory);

/* REPORTS */
router.get("/monthly-report", authMiddleware, AttendanceController.getMonthlyReport);

export default router;
