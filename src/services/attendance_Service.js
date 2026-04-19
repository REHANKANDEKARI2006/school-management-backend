import { AttendanceModel } from "../models/attendance_Model.js";
import { HolidayService } from "./holiday_service.js";

export const AttendanceService = {

  async getDashboard(date) {
    return await AttendanceModel.getDashboard(date);
  },

  async checkSession(params) {
    return await AttendanceModel.checkSession(params);
  },

  async createSession(data) {
    return await AttendanceModel.createSession(data);
  },

  async createRecords(data) {
    return await AttendanceModel.createRecords(data);
  },

  async getStudentsByClass(classId) {
    return await AttendanceModel.getStudentsByClass(classId);
  },

  async getAttendanceSummary(sessionId) {
    return await AttendanceModel.getAttendanceSummary(sessionId);
  },

  async updateRecord(data) {
    return await AttendanceModel.updateRecord(data);
  },

  async getStudentHistory(studentId) {
    return await AttendanceModel.getStudentHistory(studentId);
  },

  async getStudentDailyAttendanceWithSchedule(studentId, date) {
    return await AttendanceModel.getStudentDailyAttendanceWithSchedule(studentId, date);
  },

  async getMonthlyReport(classId, month, year) {
    const { students, records } = await AttendanceModel.getMonthlyAttendanceReport(classId, month, year);
    const holidays = await HolidayService.getHolidaysByMonth(year, month);

    // Group records by student and day
    const reportData = students.map(student => {
      const studentRecords = records.filter(r => r.student_id === student.student_id);
      const days = {};
      
      studentRecords.forEach(r => {
        const day = new Date(r.attendance_date).getDate();
        // If multiple sessions, 'Present' (status_id 1) takes priority
        if (!days[day] || r.status_id === 1) {
          days[day] = r.status_id;
        }
      });

      return {
        ...student,
        attendance: days
      };
    });

    return {
      reportData,
      holidays,
      month: parseInt(month),
      year: parseInt(year)
    };
  }

};