import express from "express";
import {
  createEvent,
  getAllEvents,
  getEventStatuses,
  updateEvent,
  generateCertificate,
  deleteEvent
} from "../controllers/events_controller.js";

const router = express.Router();

router.post("/", createEvent);
router.get("/", getAllEvents);
router.get("/statuses", getEventStatuses);
router.put("/:id", updateEvent);
router.post("/certificate/:id", generateCertificate);
router.delete("/:id", deleteEvent);

export default router;
