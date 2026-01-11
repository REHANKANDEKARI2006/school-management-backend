// routes/faculty_routes.js
import { Router } from "express";
import { FacultyController } from "../controllers/faculty_controller.js";

const router = Router();

router.get("/", FacultyController.getAllFaculty);
router.get("/:id", FacultyController.getFacultyById);
router.post("/", FacultyController.createFaculty);
router.patch("/:id", FacultyController.updateFaculty);
router.delete("/:id", FacultyController.deleteFaculty);

export default router;
