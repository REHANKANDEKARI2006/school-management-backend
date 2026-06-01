import { Router } from "express";
import { PromotionController } from "../controllers/promotion_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";
import { allowRoles } from "../middleware/role_middleware.js";

const router = Router();

// Allowed roles: Master Admin (1), Institute Admin (2), Teacher (3), Class Teacher (4)
const ALLOWED = [1, 2, 3, 4];

// GET all students available for promotion (role-filtered on backend)
router.get("/students", authMiddleware, allowRoles(...ALLOWED), PromotionController.getStudents);

// GET all classes (for target class dropdown)
router.get("/classes", authMiddleware, allowRoles(...ALLOWED), PromotionController.getClasses);

// POST promote students
router.post("/promote", authMiddleware, allowRoles(...ALLOWED), PromotionController.promote);

export default router;
