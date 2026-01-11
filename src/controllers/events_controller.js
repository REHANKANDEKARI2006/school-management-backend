import EventsService from "../services/events_services.js";

// Create Event
export const createEvent = async (req, res) => {
  try {
    const data = await EventsService.createEvent(req.body);
    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get All Events
export const getAllEvents = async (req, res) => {
  try {
    const data = await EventsService.getAllEvents();
    res.json({
      success: true,
      message: "Events fetched successfully",
      data
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
    const data = await EventsService.updateEvent(
      req.params.id,
      req.body
    );

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
