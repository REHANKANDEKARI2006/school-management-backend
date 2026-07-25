// src/routes/schedule_routes.js
import { Router } from "express";
import ScheduleController from "../controllers/schedule_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";
import instituteMiddleware from "../middleware/institute_middleware.js";
import { allowRoles } from "../middleware/role_middleware.js";

const router = Router();

router.use(authMiddleware);
router.use(instituteMiddleware);

router.get("/school", allowRoles(1, 2, 3, 4, 5, 10, 11, 18, 20), ScheduleController.getSchoolSchedule);
router.get("/my", allowRoles(1, 2, 3, 4, 5, 10, 11, 18, 20), ScheduleController.getMySchedule);
router.post("/bulk", allowRoles(1, 2, 4), ScheduleController.replaceClassSchedule);
router.post("/", allowRoles(1, 2, 4), ScheduleController.createSchedule);
router.patch("/:id", allowRoles(1, 2, 4), ScheduleController.updateSchedule);
router.delete("/:id", allowRoles(1, 2, 4), ScheduleController.deleteSchedule);

export default router;
