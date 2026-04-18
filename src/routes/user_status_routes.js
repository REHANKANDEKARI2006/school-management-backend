import { Router } from "express";
import { UserStatusController } from "../controllers/user_status_controller.js";

const router = Router();

router.get("/", UserStatusController.getAll);

export default router;
