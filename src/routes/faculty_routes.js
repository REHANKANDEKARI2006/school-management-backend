import { Router } from "express";
import { FacultyController } from "../controllers/faculty_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";
import instituteMiddleware from "../middleware/institute_middleware.js";
import { allowRoles } from "../middleware/role_middleware.js";
import upload from "../middlewares/upload.js";

const router = Router();

router.use(authMiddleware);
router.use(instituteMiddleware);

/* =========================
   PROTECTED FACULTY ROUTES
========================= */

router.get("/", allowRoles(1, 2, 3, 4, 10, 11), FacultyController.getAllFaculty);
router.get("/:id", allowRoles(1, 2, 3, 4, 10, 11), FacultyController.getFacultyById);

router.post(
  "/upload-photo",
  allowRoles(1, 2),
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

router.post("/", allowRoles(1, 2), FacultyController.createFaculty);
router.patch("/:id", allowRoles(1, 2), FacultyController.updateFaculty);
router.delete("/:id", allowRoles(1, 2), FacultyController.deleteFaculty);

export default router;
