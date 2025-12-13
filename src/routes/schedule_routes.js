import { Router } from "express";
import ScheduleController from "../controllers/schedule_controller.js";

const router = Router();

// Get full weekly schedule (school-wide)
router.get("/school", ScheduleController.getSchoolSchedule);

// Get personal schedule (student/faculty)
router.get("/my", ScheduleController.getMySchedule);

// Create schedule entry
router.post("/", ScheduleController.createSchedule);

// Update schedule entry
router.patch("/:id", ScheduleController.updateSchedule);

// Delete schedule entry
router.delete("/:id", ScheduleController.deleteSchedule);

export default router;
