// src/controllers/staff_Controller.js

// import { FacultyService } from "../services/faculty_Service.js";

export const StaffController = {

  // ---------- Create ----------
  async createStaff(req, res) {
    try {
      const staff = await StaffService.createStaff(req.body);
      res.status(201).json({
        success: true,
        message: "Staff created successfully",
        data: staff,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ---------- Get All ----------
  async getAllStaff(req, res) {
    try {
      const staff = await StaffService.getAllStaff();
      res.status(200).json({
        success: true,
        data: staff,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ---------- Get By ID ----------
  async getStaffById(req, res) {
    try {
      const staff = await StaffService.getStaffById(req.params.id);

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff not found",
        });
      }

      res.status(200).json({
        success: true,
        data: staff,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ---------- Update ----------
  async updateStaff(req, res) {
    try {
      const staff = await StaffService.updateStaff(req.params.id, req.body);

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Staff updated successfully",
        data: staff,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ---------- Delete ----------
  async deleteStaff(req, res) {
    try {
      const staff = await StaffService.deleteStaff(req.params.id);

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Staff deleted successfully",
        data: staff,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

};
