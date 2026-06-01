import { Router } from "express";
import { AttendanceController } from "../controllers/attendance_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";

const router = Router();

/* DASHBOARD */
router.get("/dashboard", authMiddleware, AttendanceController.getDashboard);

/* SESSION */
router.post("/session", authMiddleware, AttendanceController.createSession);
router.get("/session/check", authMiddleware, AttendanceController.checkSession);

/* RECORD */
router.post("/record", authMiddleware, AttendanceController.createRecords);
router.put("/record", authMiddleware, AttendanceController.updateRecord);

/* OTHERS */
router.get("/students", authMiddleware, AttendanceController.getStudents);
router.get("/summary", authMiddleware, AttendanceController.getSummary);

/* STUDENT HISTORY */
router.get("/student/:studentId", authMiddleware, AttendanceController.getStudentHistory);
router.get("/my-history", authMiddleware, AttendanceController.getMyHistory);

/* REPORTS */
router.get("/monthly-report", authMiddleware, AttendanceController.getMonthlyReport);

export default router;
