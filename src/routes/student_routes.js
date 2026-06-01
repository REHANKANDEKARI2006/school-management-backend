import { Router } from "express";
import { StudentController } from "../controllers/student_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";
import { allowRoles } from "../middleware/role_middleware.js";
import upload from "../middlewares/upload.js";

const router = Router();

// 📸 Upload photo (Admin + Teacher + Principal)
router.post(
  "/upload-photo",
  authMiddleware,
  allowRoles(1, 2, 3, 4, 5, 10, 11, 16, 17, 21),
  (req, res, next) => {
    upload.single("file")(req, res, function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: err.message || "File upload failed" });
      }
      next();
    });
  },
  StudentController.uploadPhoto
);

// 👀 View students (Admin + Teacher + Principal)
router.get(
  "/",
  authMiddleware,
  allowRoles(1, 2, 3, 4, 5, 10, 11, 16, 17, 21),
  StudentController.getAllStudents
);

// 👀 View single student
router.get(
  "/:id",
  authMiddleware,
  allowRoles(1, 2, 3, 4, 5, 10, 11, 16, 17, 21),
  StudentController.getStudentById
);

// ➕ Create student (Admin + Class Teacher + Principal)
router.post(
  "/",
  authMiddleware,
  allowRoles(1, 2, 4, 10, 11),
  StudentController.createStudent
);

// ✏️ Update student (Admin + Teacher + Mentor + Principal)
router.put(
  "/:id",
  authMiddleware,
  allowRoles(1, 2, 3, 4, 5, 10, 11, 16, 17, 21),
  StudentController.updateStudent
);

// ❌ Soft delete (Admin + Class Teacher + Principal)
router.delete(
  "/:id",
  authMiddleware,
  allowRoles(1, 2, 4, 10, 11),
  StudentController.deleteStudent
);

export default router;
