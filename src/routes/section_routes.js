import { Router } from "express";
import { SectionController } from "../controllers/section_controller.js";
const router = Router();

router.get("/by-class/:classId", SectionController.getByClass);

export default router;
