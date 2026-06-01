import express from "express";
import { login, refreshToken, getProfile, updateProfile, changePassword, uploadAvatar, inviteUser, resendInvitation, verifyInviteToken, setPassword, forgotPassword, resetPassword, verifyResetToken, getUsers, updateUserStatus, deleteUser } from "../controllers/auth_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.get("/profile", authMiddleware, getProfile);
router.put("/update-profile", authMiddleware, updateProfile);
router.put("/change-password", authMiddleware, changePassword);
router.post("/upload-avatar", authMiddleware, upload.single("file"), uploadAvatar);
router.post("/invite-user", authMiddleware, inviteUser);
router.post("/resend-invitation", authMiddleware, resendInvitation);
router.get("/verify-invite-token", verifyInviteToken);
router.get("/verify-reset-token", verifyResetToken);
router.post("/set-password", setPassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/users", authMiddleware, getUsers);
router.patch("/users/:id", authMiddleware, updateUserStatus);
router.delete("/users/:id", authMiddleware, deleteUser);

export default router;
