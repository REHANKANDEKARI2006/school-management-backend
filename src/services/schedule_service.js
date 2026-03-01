// src/services/schedule_service.js
import ScheduleModel from "../models/schedule_model.js";

const ScheduleService = {

  getSchoolSchedule() {
    return ScheduleModel.getAll();
  },

  getMySchedule(filters) {
    return ScheduleModel.getByFilter(filters);
  },

  createSchedule(data) {
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
    });
  },

  replaceClassSchedule(class_id, scheduleArray) {
    if (!class_id || !Array.isArray(scheduleArray)) {
      throw new Error("Invalid bulk schedule payload");
    }
    return ScheduleModel.replaceClassSchedule(class_id, scheduleArray);
  },

  updateSchedule(id, data) {
    return ScheduleModel.update(id, data);
  },

  deleteSchedule(id) {
    return ScheduleModel.delete(id);
  }

};

export default ScheduleService;
