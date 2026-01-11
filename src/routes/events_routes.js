import express from "express";
import { 
  createEvent,
  getAllEvents,
  updateEvent,
  generateCertificate,
  deleteEvent
} from "../controllers/events_controller.js";

const router = express.Router();

router.post("/", createEvent);
router.get("/", getAllEvents);
router.put("/:id", updateEvent);
router.post("/certificate/:id", generateCertificate);
router.delete("/:id", deleteEvent);

export default router;
