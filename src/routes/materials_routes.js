// routes/materials_routes.js

import { Router } from "express";
import { MaterialsController } from "../controllers/materials_controller.js";
import upload from "../middlewares/upload.js";

const router = Router();

// ─── Specific routes FIRST (before the /:id wildcard) ───

// Upload Material File
router.post("/upload", (req, res, next) => {
    upload.single("file")(req, res, function (err) {
        if (err) {
            console.error("Multer/Cloudinary Upload Error:", err);
            return res.status(500).json({ success: false, message: err.message || "File upload failed" });
        }
        next();
    });
}, MaterialsController.uploadMaterialFile);

// Download Material File
router.get("/download/:id", MaterialsController.downloadMaterialFile);

// Diagnostic Stream Path for QA
router.get("/diagnostics/stream/:id", MaterialsController.diagnosticDownload);

// ─── Generic routes ───

// Add Material
router.post("/", MaterialsController.addMaterial);

// Get All Materials
router.get("/", MaterialsController.getAllMaterials);

// Get Single Material (wildcard — must be LAST among GETs)
router.get("/:id", MaterialsController.getMaterial);

// Update Material
router.put("/:id", MaterialsController.updateMaterial);

// Delete Material
router.delete("/:id", MaterialsController.deleteMaterial);

export default router;
