import express from "express";
import {
  createEvent,
  getAllEvents,
  getEventStatuses,
  getEventDetail,
  updateEvent,
  generateCertificate,
  deleteEvent,
  getCoordinatorEvents,
  getEventAttendanceData,
  submitEventAttendance,
  unlockAttendance,
  getDisplacedPeriods,
  uploadPhotos,
  getPhotos,
  deletePhoto
} from "../controllers/events_controller.js";
import multer from "multer";
import { storage } from "../config/cloudinary.js";
import { allowRoles } from "../middleware/role_middleware.js";
import authMiddleware from "../middleware/auth_middleware.js";
import instituteMiddleware from "../middleware/institute_middleware.js";

const upload = multer({ storage });

const router = express.Router();

router.use(authMiddleware);
router.use(instituteMiddleware);

// Core CRUD
router.post("/", allowRoles(1, 2), createEvent);
router.get("/", getAllEvents);
router.get("/statuses", getEventStatuses);

// Coordinator dashboard prompt
router.get("/coordinator/today", allowRoles(1, 2, 3, 4, 5), getCoordinatorEvents);

// Event detail
router.get("/:id", getEventDetail);
router.put("/:id", allowRoles(1, 2), updateEvent);

// Photo delete must come BEFORE /:id delete to avoid Express route conflict
router.delete("/photos/:photoId", allowRoles(1, 2), deletePhoto);
router.delete("/:id", allowRoles(1, 2), deleteEvent);

// Certificates
router.post("/certificate/:id", authMiddleware, generateCertificate);

// Event Attendance
router.get("/:id/attendance/:classId", authMiddleware, getEventAttendanceData);
router.post("/:id/attendance/:classId", authMiddleware, submitEventAttendance);
router.post("/:id/attendance/:classId/unlock", authMiddleware, unlockAttendance);

// Displaced periods
router.get("/:id/displaced-periods", authMiddleware, getDisplacedPeriods);

// Event Photos
router.post("/:id/photos", authMiddleware, allowRoles(1, 2), upload.array("photos", 10), uploadPhotos);
router.get("/:id/photos", getPhotos);

export default router;
