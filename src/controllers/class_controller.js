// controllers/class_controller.js
import { ClassService } from "../services/class_Service.js";

export const ClassController = {

  async getAllClasses(req, res) {
    try {
      const data = await ClassService.getAllClasses(req.instituteId);
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
        const data = await ClassService.getAllClassesForAdmin(req.instituteId);
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
      const data = await ClassService.getClassById(req.params.id, req.instituteId);
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
      const data = await ClassService.createClass(req.body, req.instituteId);
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
      const { role_id } = req.user;
      const classId = req.params.id;

      // Only admins can update classes
      const isAdmin = [1, 2, 10, 11, 16, 17].includes(role_id);
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Only administrators can update class details"
        });
      }

      const data = await ClassService.updateClass(classId, req.body, req.instituteId);
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
      const { role_id } = req.user;

      // Only admins can delete classes
      const isAdmin = [1, 2, 10, 11, 16, 17].includes(role_id);
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Only administrators can delete classes"
        });
      }

      const data = await ClassService.deleteClass(req.params.id, req.instituteId);
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
