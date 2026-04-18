import express from "express";
import { login, refreshToken, getProfile, updateProfile, changePassword, uploadAvatar } from "../controllers/auth_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.get("/profile", authMiddleware, getProfile);
router.put("/update-profile", authMiddleware, updateProfile);
router.put("/change-password", authMiddleware, changePassword);
router.post("/upload-avatar", authMiddleware, upload.single("file"), uploadAvatar);

export default router;
