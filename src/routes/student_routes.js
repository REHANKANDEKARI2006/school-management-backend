import { Router } from "express";
import { StudentController } from "../controllers/student_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";
import { allowRoles } from "../middleware/role_middleware.js";
import upload from "../middlewares/upload.js";

const router = Router();

// 📸 Upload photo (Admin)
router.post(
  "/upload-photo",
  authMiddleware,
  allowRoles(1, 2),
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

// 👀 View students (Admin + Teacher)
router.get(
  "/",
  authMiddleware,
  allowRoles(1, 2, 3, 4), // MASTER, ADMIN, TEACHER
  StudentController.getAllStudents
);

// 👀 View single student
router.get(
  "/:id",
  authMiddleware,
  allowRoles(1, 2, 3, 4),
  StudentController.getStudentById
);

// ➕ Create student (Admin only)
router.post(
  "/",
  authMiddleware,
  allowRoles(1, 2),
  StudentController.createStudent
);

// ✏️ Update student (Admin + Teacher)
router.put(
  "/:id",
  authMiddleware,
  allowRoles(1, 2, 3, 4),
  StudentController.updateStudent
);

// ❌ Soft delete (ONLY MASTER ADMIN)
router.delete(
  "/:id",
  authMiddleware,
  allowRoles(1, 4), // MASTER ADMIN + CLASS TEACHER
  StudentController.deleteStudent
);

export default router;
