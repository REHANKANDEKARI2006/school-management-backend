// routes/materials_routes.js

import { Router } from "express";
import { MaterialsController } from "../controllers/materials_controller.js";

const router = Router();

// Add Material
router.post("/", MaterialsController.addMaterial);

// Get All Materials
router.get("/", MaterialsController.getAllMaterials);

// Get Single Material
router.get("/:id", MaterialsController.getMaterial);

// Update Material
router.put("/:id", MaterialsController.updateMaterial);

// Delete Material
router.delete("/:id", MaterialsController.deleteMaterial);

// Upload Material File
router.post("/upload", MaterialsController.uploadMaterialFile);

// Download Material File
router.get("/download/:id", MaterialsController.downloadMaterialFile);

export default router;
