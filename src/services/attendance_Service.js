import { AttendanceModel } from "../models/attendance_Model.js";
import { HolidayService } from "./holiday_service.js";

export const AttendanceService = {

  async getDashboard(date, instituteId) {
    const classes = await AttendanceModel.getDashboard(date, instituteId);
    
    // Check if the date is a holiday or Sunday
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const holidays = await HolidayService.getHolidays(year, instituteId);
    
    // Format date string to YYYY-MM-DD local time instead of UTC to avoid timezone issues
    const yearStr = dateObj.getFullYear();
    const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dayStr = String(dateObj.getDate()).padStart(2, '0');
    const localDateStr = `${yearStr}-${monthStr}-${dayStr}`;

    const todaysHolidays = holidays.filter(h => h.date === localDateStr);
    const isSunday = dateObj.getDay() === 0;
    
    let holidayNames = todaysHolidays.map(h => h.name);
    if (isSunday && holidayNames.length === 0) {
      holidayNames = ['Sunday'];
    }

    return {
      classes,
      is_holiday: todaysHolidays.length > 0 || isSunday,
      holiday_names: holidayNames
    };
  },

  async getTeacherDashboard(date, userId, instituteId) {
    const classes = await AttendanceModel.getTeacherDashboard(date, userId, instituteId);
    
    // Check if the date is a holiday or Sunday
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const holidays = await HolidayService.getHolidays(year, instituteId);
    
    // Format date string to YYYY-MM-DD local time instead of UTC to avoid timezone issues
    const yearStr = dateObj.getFullYear();
    const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dayStr = String(dateObj.getDate()).padStart(2, '0');
    const localDateStr = `${yearStr}-${monthStr}-${dayStr}`;

    const todaysHolidays = holidays.filter(h => h.date === localDateStr);
    const isSunday = dateObj.getDay() === 0;
    
    let holidayNames = todaysHolidays.map(h => h.name);
    if (isSunday && holidayNames.length === 0) {
      holidayNames = ['Sunday'];
    }

    return {
      classes,
      is_holiday: todaysHolidays.length > 0 || isSunday,
      holiday_names: holidayNames
    };
  },

  async verifyTeacherSchedule(userId, classId, subjectId) {
    return await AttendanceModel.verifyTeacherSchedule(userId, classId, subjectId);
  },

  async verifyTeacherSession(userId, sessionId) {
    return await AttendanceModel.verifyTeacherSession(userId, sessionId);
  },

  async verifyTeacherClass(userId, classId) {
    return await AttendanceModel.verifyTeacherClass(userId, classId);
  },

  async checkSession(params) {
    return await AttendanceModel.checkSession(params);
  },

  async createSession(data, instituteId) {
    return await AttendanceModel.createSession(data, instituteId);
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

  async getMonthlyReport(classId, month, year, instituteId) {
    const { students, records } = await AttendanceModel.getMonthlyAttendanceReport(classId, month, year);
    const holidays = await HolidayService.getHolidaysByMonth(year, month, instituteId);

    // Group records by student and day
    const reportData = students.map(student => {
      const studentRecords = records.filter(r => r.student_id === student.student_id);
      const days = {};
      
      studentRecords.forEach(r => {
        let day;
        if (typeof r.attendance_date === 'string') {
          const datePart = r.attendance_date.split('T')[0];
          day = parseInt(datePart.split('-')[2], 10);
        } else if (r.attendance_date instanceof Date) {
          day = r.attendance_date.getDate();
        } else {
          day = new Date(r.attendance_date).getDate();
        }

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