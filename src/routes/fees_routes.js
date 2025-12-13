// src/routes/fees_routes.js
import { Router } from "express";
import { FeesController } from "../controllers/fees_controller.js";

const router = Router();

router.get("/", FeesController.getAllCategories);
router.post("/", FeesController.createCategory);
router.patch("/:id", FeesController.updateCategory);
router.delete("/:id", FeesController.deleteCategory);

export default router;
