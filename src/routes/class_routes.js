import { Router } from "express";
import { ClassController } from "../controllers/class_controller.js";

const router = Router();

router.get("/", ClassController.getAllClasses);
router.get("/:id", ClassController.getClassById);
router.post("/", ClassController.createClass);
router.patch("/:id", ClassController.updateClass);
router.delete("/:id", ClassController.deleteClass);

export default router;
