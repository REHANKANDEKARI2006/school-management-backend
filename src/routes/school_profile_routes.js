import { Router } from "express";
import { SchoolProfileController } from "../controllers/school_profile_controller.js";
import { allowRoles } from "../middleware/role_middleware.js";
import upload from "../middlewares/upload.js";

const router = Router();

// Upload Logo
router.post("/upload-logo", allowRoles(1, 2, 21), (req, res, next) => {
    upload.single("file")(req, res, function (err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message || "File upload failed" });
        }
        next();
    });
}, SchoolProfileController.uploadLogo);

// Upload Signature
router.post("/upload-signature", allowRoles(1, 2, 21), (req, res, next) => {
    upload.single("file")(req, res, function (err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message || "File upload failed" });
        }
        next();
    });
}, SchoolProfileController.uploadSignature);

// Upload Secondary Logo
router.post("/upload-secondary-logo", allowRoles(1, 2, 21), (req, res, next) => {
    upload.single("file")(req, res, function (err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message || "File upload failed" });
        }
        next();
    });
}, SchoolProfileController.uploadSecondaryLogo);

// Upload Stamp
router.post("/upload-stamp", allowRoles(1, 2, 21), (req, res, next) => {
    upload.single("file")(req, res, function (err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message || "File upload failed" });
        }
        next();
    });
}, SchoolProfileController.uploadStamp);

// GET and UPSERT Profile
router.get("/", SchoolProfileController.getProfile);
router.put("/", allowRoles(1, 2, 21), SchoolProfileController.upsertProfile);

export default router;
