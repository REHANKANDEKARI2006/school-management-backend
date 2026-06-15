// src/services/schedule_service.js
import ScheduleModel from "../models/schedule_model.js";

const ScheduleService = {

  getSchoolSchedule(instituteId) {
    return ScheduleModel.getAll(instituteId);
  },

  getMySchedule(filters, instituteId) {
    return ScheduleModel.getByFilter(filters, instituteId);
  },

  createSchedule(data, instituteId) {
    const {
      class_id,
      staff_id,
      subject_id,
      schedule_date,
      day_of_week,
      period_number,
      start_time,
      end_time,
      room_id,
      is_break
    } = data;

    if (!class_id || !day_of_week || !period_number || !start_time || !end_time) {
      throw new Error("Required fields missing");
    }

    return ScheduleModel.create({
      class_id,
      staff_id,
      subject_id,
      schedule_date,
      day_of_week,
      period_number,
      start_time,
      end_time,
      room_id,
      is_break
    }, instituteId);
  },

  replaceClassSchedule(class_id, scheduleArray, instituteId) {
    if (!class_id || !Array.isArray(scheduleArray)) {
      throw new Error("Invalid bulk schedule payload");
    }
    return ScheduleModel.replaceClassSchedule(class_id, scheduleArray, instituteId);
  },

  updateSchedule(id, data, instituteId) {
    return ScheduleModel.update(id, data, instituteId);
  },

  deleteSchedule(id, instituteId) {
    return ScheduleModel.delete(id, instituteId);
  }

};

export default ScheduleService;
