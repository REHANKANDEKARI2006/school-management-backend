import { AttendanceModel } from "../models/attendance_Model.js";

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
  }

};
