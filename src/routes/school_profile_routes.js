import { Router } from "express";
import { SchoolProfileController } from "../controllers/school_profile_controller.js";
import authMiddleware from "../middleware/auth_middleware.js";
import { allowRoles } from "../middleware/role_middleware.js";
import upload from "../middlewares/upload.js";

const router = Router();

// Upload Logo
router.post("/upload-logo", authMiddleware, allowRoles(1, 21), (req, res, next) => {
    upload.single("file")(req, res, function (err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message || "File upload failed" });
        }
        next();
    });
}, SchoolProfileController.uploadLogo);

// Upload Signature
router.post("/upload-signature", authMiddleware, allowRoles(1, 21), (req, res, next) => {
    upload.single("file")(req, res, function (err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message || "File upload failed" });
        }
        next();
    });
}, SchoolProfileController.uploadSignature);

// Upload Secondary Logo
router.post("/upload-secondary-logo", authMiddleware, allowRoles(1, 21), (req, res, next) => {
    upload.single("file")(req, res, function (err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message || "File upload failed" });
        }
        next();
    });
}, SchoolProfileController.uploadSecondaryLogo);

// Upload Stamp
router.post("/upload-stamp", authMiddleware, allowRoles(1, 21), (req, res, next) => {
    upload.single("file")(req, res, function (err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message || "File upload failed" });
        }
        next();
    });
}, SchoolProfileController.uploadStamp);

// GET and UPSERT Profile
router.get("/", authMiddleware, SchoolProfileController.getProfile);
router.put("/", authMiddleware, allowRoles(1, 21), SchoolProfileController.upsertProfile);

export default router;
