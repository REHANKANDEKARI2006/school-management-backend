// controllers/faculty_controller.js
import { FacultyService } from "../services/faculty_Service.js";

export const FacultyController = {

  async getAllFaculty(req, res) {
    try {
      const data = await FacultyService.getAllFaculty();
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async getFacultyById(req, res) {
    try {
      const data = await FacultyService.getFacultyById(req.params.id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async createFaculty(req, res) {
    try {
      const data = await FacultyService.createFaculty(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async updateFaculty(req, res) {
    try {
      const data = await FacultyService.updateFaculty(req.params.id, req.body);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async deleteFaculty(req, res) {
    try {
      const data = await FacultyService.deleteFaculty(req.params.id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        message: err.message,
      });
    }
  },
};
