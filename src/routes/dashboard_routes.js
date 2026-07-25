import express from "express";
import { DashboardController } from "../controllers/dashboard_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";
import instituteMiddleware from "../middleware/institute_middleware.js";
import { allowRoles } from "../middleware/role_middleware.js";

const router = express.Router();

router.get("/summary", authMiddleware, instituteMiddleware, DashboardController.getDashboardSummary);
router.get("/student", authMiddleware, instituteMiddleware, allowRoles(1, 2, 18, 20), DashboardController.getStudentDashboard);

export default router;
