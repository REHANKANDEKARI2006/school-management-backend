// routes/student_routes.js
import { Router } from "express";
import { StudentController } from "../controllers/student_controller.js";

const router = Router();

router.get("/", StudentController.getAllStudents);
router.get("/:id", StudentController.getStudentById);
router.post("/", StudentController.createStudent);
router.put("/:id", StudentController.updateStudent);    // using PUT (full/partial allowed)
router.delete("/:id", StudentController.deleteStudent);

export default router;
