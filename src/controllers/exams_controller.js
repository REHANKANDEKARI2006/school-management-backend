import ExamsService from "../services/exams_service.js";
import { computeStatus } from "../utils/computeStatus.js";

const ExamsController = {

  async createExam(req, res) {
    try {
      const data = await ExamsService.createExam(req.body);

      // Log activity
      try {
          const { DashboardService } = await import("../services/dashboard_service.js");
          await DashboardService.addActivityEntry(
              req.user.user_id,
              'exam_scheduled',
              `New exam scheduled: ${req.body.exam_name}`
          );
      } catch (e) { console.error(e); }

      res.json({ success: true, message: "Exam created", data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getAllExams(req, res) {
    try {
      const { class_id } = req.query;
      const data = await ExamsService.getAllExams(class_id);
      
      const enrichedData = data.map(exam => ({
        ...exam,
        computed_status: computeStatus(exam)
      }));

      res.json({ success: true, data: enrichedData });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getExamById(req, res) {
    try {
      const data = await ExamsService.getExamById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: "Exam not found" });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async updateExam(req, res) {
    try {
      const data = await ExamsService.updateExam(req.params.id, req.body);
      res.json({ success: true, message: "Exam updated", data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async deleteExam(req, res) {
    try {
      await ExamsService.deleteExam(req.params.id);
      res.json({ success: true, message: "Exam deleted" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getExamTypes(req, res) {
    try {
      const data = await ExamsService.getExamTypes();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getExamStatuses(req, res) {
    try {
      const data = await ExamsService.getExamStatuses();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async addGrades(req, res) {
    try {
      const exam_id = req.params.exam_id;
      const data = await ExamsService.addGrades(exam_id, req.body);
      res.json({ success: true, message: "Grade saved", data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getGrades(req, res) {
    try {
      const exam_id = req.params.exam_id;
      const data = await ExamsService.getGrades(exam_id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async addBulkGrades(req, res) {
    try {
      const exam_id = req.params.exam_id;
      const data = await ExamsService.addBulkGrades(exam_id, req.body.grades);
      res.json({ success: true, message: "Grades saved successfully", data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

};

export default ExamsController;
