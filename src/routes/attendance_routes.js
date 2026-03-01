import { Router } from "express";
import { AttendanceController } from "../controllers/attendance_controller.js";

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

export default router;
