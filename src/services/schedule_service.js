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
      staff_id,
      subject_id,
      class_id,
      section_id,
      day_of_week,
      start_time,
      end_time,
      activity_type
    } = data;

    if (!class_id || !section_id || !day_of_week || !start_time || !end_time) {
      throw new Error("Required fields missing");
    }

    return ScheduleModel.create({
      staff_id,
      subject_id,
      class_id,
      section_id,
      day_of_week,
      start_time,
      end_time,
      activity_type
    });
  },

  updateSchedule(id, data) {
    return ScheduleModel.update(id, data);
  },

  deleteSchedule(id) {
    return ScheduleModel.delete(id);
  }

};

export default ScheduleService;
