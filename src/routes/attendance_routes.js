import { Router } from "express";
import { AttendanceController } from "../controllers/attendance_controller.js";

const router = Router();

// Get all classes for attendance dropdown
router.get("/classes", AttendanceController.getAllClasses);

// Get subjects of a specific class
router.get("/classes/:id/subjects", AttendanceController.getSubjectsByClass);

// Start a new attendance session
router.post("/session", AttendanceController.startAttendanceSession);

export default router;
