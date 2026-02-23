import { Router } from "express";
import { SectionController } from "../controllers/section_controller.js";

const router = Router();

// ✅ ALL SECTIONS — FOR DROPDOWN
router.get("/", SectionController.getAllSections);

// ✅ SECTIONS BY CLASS
router.get("/by-class/:classId", SectionController.getByClass);

export default router;
