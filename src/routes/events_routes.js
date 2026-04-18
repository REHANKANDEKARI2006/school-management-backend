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
  getDisplacedPeriods
} from "../controllers/events_controller.js";

const router = express.Router();

// Core CRUD
router.post("/", createEvent);
router.get("/", getAllEvents);
router.get("/statuses", getEventStatuses);

// Coordinator dashboard prompt
router.get("/coordinator/today", getCoordinatorEvents);

// Event detail
router.get("/:id", getEventDetail);
router.put("/:id", updateEvent);
router.delete("/:id", deleteEvent);

// Certificates
router.post("/certificate/:id", generateCertificate);

// Event Attendance
router.get("/:id/attendance/:classId", getEventAttendanceData);
router.post("/:id/attendance/:classId", submitEventAttendance);
router.post("/:id/attendance/:classId/unlock", unlockAttendance);

// Displaced periods
router.get("/:id/displaced-periods", getDisplacedPeriods);

export default router;
