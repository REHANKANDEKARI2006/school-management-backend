import express from "express";
import { DashboardController } from "../controllers/dashboard_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";

const router = express.Router();

router.get("/summary", authMiddleware, DashboardController.getDashboardSummary);
router.get("/student", authMiddleware, DashboardController.getStudentDashboard);

export default router;
