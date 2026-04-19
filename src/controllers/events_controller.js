// src/controllers/events_controller.js
// Enhanced Event Controller — Full event management with period exchange and attendance
import EventsService from "../services/events_services.js";
import { computeStatus } from "../utils/computeStatus.js";

// Create Event (enhanced with class assignments + period exchange)
export const createEvent = async (req, res) => {
  try {
    const data = await EventsService.createEventWithExchange(req.body);
    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data
    });
  } catch (error) {
    console.error("CRITICAL: createEvent error:", error);
    console.error("PAYLOAD RECEIVED:", JSON.stringify(req.body, null, 2));
    
    // Provide a more descriptive message for the diagnostic phase
    let detail = error.message;
    if (error.detail) detail += ` - ${error.detail}`;
    if (error.code) detail += ` (DB_CODE: ${error.code})`;

    res.status(500).json({
      success: false,
      message: "Server Error: " + detail,
      error_code: error.code,
      technical_details: detail
    });
  }
};

// Get All Events
export const getAllEvents = async (req, res) => {
  try {
    let { class_id } = req.query;
    const cleanClassId = class_id && !isNaN(parseInt(class_id)) ? parseInt(class_id) : null;
    const data = await EventsService.getAllEvents(cleanClassId);
    
    const enrichedData = data.map(event => ({
      ...event,
      computed_status: computeStatus(event)
    }));

    res.json({
      success: true,
      message: "Events fetched successfully",
      data: enrichedData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get Event Detail
export const getEventDetail = async (req, res) => {
  try {
    const data = await EventsService.getEventDetail(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    res.json({
      success: true,
      message: "Event detail fetched successfully",
      data: {
        ...data,
        computed_status: computeStatus(data)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update Event
export const updateEvent = async (req, res) => {
  try {
    const data = await EventsService.updateEvent(req.params.id, req.body);
    res.json({
      success: true,
      message: "Event updated successfully",
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete Event
export const deleteEvent = async (req, res) => {
  try {
    await EventsService.deleteEvent(req.params.id);
    res.json({
      success: true,
      message: "Event deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Generate Certificate (future logic)
export const generateCertificate = async (req, res) => {
  res.json({
    success: true,
    message: `Certificate generated for Event ID ${req.params.id}`
  });
};

// Get Event Statuses
export const getEventStatuses = async (req, res) => {
  try {
    const data = await EventsService.getEventStatuses();
    res.json({
      success: true,
      message: "Event statuses fetched successfully",
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ───────────── COORDINATOR EVENTS ─────────────

// Get coordinator's events for today (dashboard prompt)
export const getCoordinatorEvents = async (req, res) => {
  try {
    const staffId = req.query.staff_id;
    if (!staffId) {
      return res.status(400).json({ success: false, message: "staff_id required" });
    }
    const data = await EventsService.getCoordinatorDashboardEvents(staffId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ───────────── EVENT ATTENDANCE ─────────────

// Get attendance page data
export const getEventAttendanceData = async (req, res) => {
  try {
    const { id, classId } = req.params;
    const data = await EventsService.getEventAttendanceData(id, classId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Submit event attendance
export const submitEventAttendance = async (req, res) => {
  try {
    const { id, classId } = req.params;
    const { records, staff_id } = req.body;
    
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: "records array required" });
    }

    const data = await EventsService.submitEventAttendance(
      parseInt(id), parseInt(classId), records, staff_id
    );

    res.json({
      success: true,
      message: "Event attendance submitted successfully",
      data
    });
  } catch (error) {
    console.error("submitEventAttendance error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Unlock attendance for editing (admin only)
export const unlockAttendance = async (req, res) => {
  try {
    const { id, classId } = req.params;
    const data = await EventsService.unlockAttendanceEdit(parseInt(id), parseInt(classId));
    res.json({ success: true, message: "Attendance unlocked for editing", data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get displaced periods for an event
export const getDisplacedPeriods = async (req, res) => {
  try {
    const data = await EventsService.getDisplacedPeriods(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ───────────── EVENT PHOTOS ─────────────

// Upload multiple photos for an event
export const uploadPhotos = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No photos uploaded" });
    }

    const data = await EventsService.uploadEventPhotos(id, req.files);
    res.status(201).json({
      success: true,
      message: `${req.files.length} photos uploaded successfully`,
      data
    });
  } catch (error) {
    console.error("EVENT_PHOTO_UPLOAD_ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      technical_details: "Check backend logs for full stack trace"
    });
  }
};

// Get all photos for an event
export const getPhotos = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await EventsService.getEventPhotos(id);
    res.json({
      success: true,
      message: "Photos fetched successfully",
      data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
