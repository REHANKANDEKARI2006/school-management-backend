import { AttendanceService } from "../services/attendance_Service.js";

export const AttendanceController = {

  async getDashboard(req, res) {
    try {
      const { date } = req.query;
      const data = await AttendanceService.getDashboard(date);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async checkSession(req, res) {
    try {
      const data = await AttendanceService.checkSession(req.query);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async createSession(req, res) {
    try {
      const data = await AttendanceService.createSession(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async createRecords(req, res) {
    try {
      const data = await AttendanceService.createRecords(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

};
