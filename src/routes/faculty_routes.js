// routes/faculty_routes.js
import { Router } from "express";
import { FacultyController } from "../controllers/faculty_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";
import upload from "../middlewares/upload.js";

const router = Router();

/* =========================
   PROTECTED FACULTY ROUTES
========================= */

router.get("/", authMiddleware, FacultyController.getAllFaculty);
router.get("/:id", authMiddleware, FacultyController.getFacultyById);

router.post("/upload-photo", authMiddleware, upload.single("file"), FacultyController.uploadPhoto);

router.post("/", authMiddleware, FacultyController.createFaculty);
router.patch("/:id", authMiddleware, FacultyController.updateFaculty);
router.delete("/:id", authMiddleware, FacultyController.deleteFaculty);

export default router;
