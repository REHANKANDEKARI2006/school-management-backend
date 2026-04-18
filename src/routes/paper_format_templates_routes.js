// src/routes/paper_format_templates_routes.js
import { Router } from "express";
import PaperFormatTemplatesController from "../controllers/paper_format_templates_controller.js";

const router = Router();

router.get("/",    PaperFormatTemplatesController.listAll);    // GET /api/paper-format-templates
router.get("/find",PaperFormatTemplatesController.getTemplate); // GET /api/paper-format-templates/find?class_name=8&subject=Mathematics&exam_type=half_yearly
router.get("/:id", PaperFormatTemplatesController.getById);    // GET /api/paper-format-templates/:id

export default router;
