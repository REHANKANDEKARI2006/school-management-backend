import { AttendanceService } from "../services/attendance_Service.js";
import { StudentService } from "../services/student_Service.js";

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

      // Log activity
      try {
          const { DashboardService } = await import("../services/dashboard_service.js");
          await DashboardService.addActivityEntry(
              req.user.user_id,
              'attendance_marked',
              `Attendance marked for Session ID: ${req.body.sessionId}`
          );
      } catch (e) { console.error(e); }

      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getStudents(req, res) {
    try {
      const { classId } = req.query;
      const data = await AttendanceService.getStudentsByClass(classId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getSummary(req, res) {
    try {
      const { sessionId } = req.query;
      const data = await AttendanceService.getAttendanceSummary(sessionId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async updateRecord(req, res) {
    try {
      const data = await AttendanceService.updateRecord(req.body);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getStudentHistory(req, res) {
    try {
      const { studentId } = req.params;
      const { date } = req.query;
      
      let data;
      if (date) {
        data = await AttendanceService.getStudentDailyAttendanceWithSchedule(studentId, date);
      } else {
        data = await AttendanceService.getStudentHistory(studentId);
      }
      
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getMyHistory(req, res) {
    try {
      const { user_id, role_id } = req.user;
      if (role_id !== 18) {
        return res.status(403).json({ success: false, message: "Only students can access this" });
      }

      // 1. Get student_id from user_id
      const student = await StudentService.getStudentByUserId(user_id);
      if (!student) {
        return res.status(404).json({ success: false, message: "Student record not found" });
      }

      // 2. Wrap existing history logic
      const data = await AttendanceService.getStudentHistory(student.student_id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      console.error("getMyHistory Error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

};
