import { Router } from "express";
import { StudentController } from "../controllers/student_controller.js";

const router = Router();

router.get("/", StudentController.getAllStudents);
router.get("/:id", StudentController.getStudentById);
router.post("/", StudentController.createStudent);
router.put("/:id", StudentController.updateStudent);
router.delete("/:id", StudentController.deleteStudent);

export default router;
