// controllers/class_controller.js
import { ClassService } from "../services/class_Service.js";

export const ClassController = {

  async getAllClasses(req, res) {
    try {
      const data = await ClassService.getAllClasses();
      res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        message: err.message
      });
    }
  },

  async getAllClassesForAdmin(req, res) {
      try {
        const data = await ClassService.getAllClassesForAdmin();
        res.status(200).json({ success: true, data });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: err.message,
        });
      }
    },


  async getClassById(req, res) {
    try {
      const data = await ClassService.getClassById(req.params.id);
      res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        message: err.message
      });
    }
  },

  async createClass(req, res) {
    try {
      const data = await ClassService.createClass(req.body);
      res.status(201).json({
        success: true,
        data
      });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        message: err.message
      });
    }
  },

  async updateClass(req, res) {
    try {
      const data = await ClassService.updateClass(
        req.params.id,
        req.body
      );
      res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        message: err.message
      });
    }
  },

  async deleteClass(req, res) {
    try {
      const data = await ClassService.deleteClass(req.params.id);
      res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        message: err.message
      });
    }
  }
};
