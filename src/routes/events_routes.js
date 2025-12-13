import express from "express";
import { 
  createEvent,
  getAllEvents,
  updateEvent,
  generateCertificate,
  deleteEvent
} from "../controllers/events_controller.js";

const router = express.Router();

// Create New Event
router.post("/", createEvent);

// Get All Events
router.get("/", getAllEvents);

// Update Event
router.put("/:id", updateEvent);

// Generate Certificate for Event
router.post("/certificate/:id", generateCertificate);

// Delete Event
router.delete("/:id", deleteEvent);

export default router;
