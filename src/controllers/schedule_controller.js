// src/controllers/schedule_controller.js
import ScheduleService from "../services/schedule_service.js";

const ScheduleController = {

  async getSchoolSchedule(req, res) {
    try {
      const data = await ScheduleService.getSchoolSchedule();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getMySchedule(req, res) {
    try {
      const { staff_id, class_id } = req.query;
      const data = await ScheduleService.getMySchedule({ staff_id, class_id });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async createSchedule(req, res) {
    try {
      const data = await ScheduleService.createSchedule(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  async replaceClassSchedule(req, res) {
    try {
      const { class_id, scheduleArray } = req.body;
      const data = await ScheduleService.replaceClassSchedule(class_id, scheduleArray);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  async updateSchedule(req, res) {
    try {
      const data = await ScheduleService.updateSchedule(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  async deleteSchedule(req, res) {
    try {
      await ScheduleService.deleteSchedule(req.params.id);
      res.json({ success: true, message: "Schedule deleted" });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

};

export default ScheduleController;
