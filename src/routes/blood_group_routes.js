import { Router } from "express";
import { BloodGroupController } from "../controllers/blood_group_controller.js";
const router = Router();

router.get("/", BloodGroupController.getAll);

export default router;
