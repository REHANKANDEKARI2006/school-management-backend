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

router.post(
  "/upload-photo",
  authMiddleware,
  (req, res, next) => {
    upload.single("file")(req, res, function (err) {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ success: false, message: "File size exceeds the 4 MB limit. Please select an image smaller than 4 MB." });
        }
        return res.status(400).json({ success: false, message: err.message || "File upload failed" });
      }
      next();
    });
  },
  FacultyController.uploadPhoto
);

router.post("/", authMiddleware, FacultyController.createFaculty);
router.patch("/:id", authMiddleware, FacultyController.updateFaculty);
router.delete("/:id", authMiddleware, FacultyController.deleteFaculty);

export default router;
