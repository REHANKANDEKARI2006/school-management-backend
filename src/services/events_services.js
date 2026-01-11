// src/services/events_service.js
import EventsModel from "../models/events_model.js";

const EventsService = {

  createEvent: async (data) => {
    return await EventsModel.createEvent(data);
  },

  getAllEvents: async () => {
    return await EventsModel.getAllEvents();
  },

  updateEvent: async (id, data) => {
    return await EventsModel.updateEvent(id, data);
  },

  generateCertificate: async (eventId) => {
    // Future logic (PDF / student mapping)
    return {
      event_id: eventId,
      certificate_no: "CERT-" + Date.now()
    };
  },

  deleteEvent: async (id) => {
    return await EventsModel.deleteEvent(id);
  }

};

export default EventsService;
