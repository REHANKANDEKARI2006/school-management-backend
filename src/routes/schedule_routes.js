// src/routes/schedule_routes.js
import { Router } from "express";
import ScheduleController from "../controllers/schedule_controller.js";

const router = Router();

router.get("/school", ScheduleController.getSchoolSchedule);
router.get("/my", ScheduleController.getMySchedule);
router.post("/bulk", ScheduleController.replaceClassSchedule);
router.post("/", ScheduleController.createSchedule);
router.patch("/:id", ScheduleController.updateSchedule);
router.delete("/:id", ScheduleController.deleteSchedule);

export default router;
