import ExamsService from "../services/exams_service.js";
import { computeStatus } from "../utils/computeStatus.js";
import pool from "../config/db.js";

const ExamsController = {

  async createExam(req, res) {
    try {
      const data = await ExamsService.createExam(req.body, req.instituteId);

      // Log activity
      try {
          const { DashboardService } = await import("../services/dashboard_service.js");
          await DashboardService.addActivityEntry(
              req.user.user_id,
              'exam_scheduled',
              `New exam scheduled: ${req.body.exam_name}`,
              req.instituteId
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
      const data = await ExamsService.getAllExams(class_id, req.instituteId);
      
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
      const data = await ExamsService.getExamById(req.params.id, req.instituteId);
      if (!data) return res.status(404).json({ success: false, message: "Exam not found" });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async updateExam(req, res) {
    try {
      const data = await ExamsService.updateExam(req.params.id, req.body, req.instituteId);
      res.json({ success: true, message: "Exam updated", data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async deleteExam(req, res) {
    try {
      await ExamsService.deleteExam(req.params.id, req.instituteId);
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
      const exam = await ExamsService.getExamById(exam_id, req.instituteId);
      if (!exam) {
        return res.status(404).json({ success: false, message: "Exam not found" });
      }

      if (exam.marks_status === 'Submitted') {
        return res.status(403).json({ success: false, message: "Marks are locked and cannot be modified." });
      }

      const roleId = Number(req.user.role_id);
      const isTeacher = roleId === 3 || roleId === 4;
      if (isTeacher) {
        const staffRes = await pool.query("SELECT staff_id FROM staff WHERE user_id = $1 AND institute_id = $2", [req.user.user_id, req.instituteId]);
        if (staffRes.rows.length === 0) {
          return res.status(403).json({ success: false, message: "Faculty record not found." });
        }
        const staffId = staffRes.rows[0].staff_id;

        const scheduleRes = await pool.query(
          "SELECT 1 FROM schedule WHERE class_id = $1 AND subject_id = $2 AND staff_id = $3 AND institute_id = $4 LIMIT 1",
          [exam.class_id, exam.subject_id, staffId, req.instituteId]
        );
        if (scheduleRes.rows.length === 0) {
          return res.status(403).json({ success: false, message: "You are not authorized to enter grades for this subject/class." });
        }
      }

      if (req.body.marks_obtained !== undefined) {
        const marks = parseFloat(req.body.marks_obtained);
        if (isNaN(marks) || marks < 0 || (exam.total_score && marks > exam.total_score)) {
          return res.status(400).json({ success: false, message: `Marks obtained (${marks}) cannot exceed total score (${exam.total_score}) or be less than 0.` });
        }
      }

      const data = await ExamsService.addGrades(exam_id, req.body, req.instituteId);

      const status = req.body.status;
      if (status && ['Draft', 'Submitted'].includes(status)) {
        await pool.query("UPDATE exam SET marks_status = $1, updated_at = now() WHERE exam_id = $2 AND institute_id = $3", [status, exam_id, req.instituteId]);
      }

      res.json({ success: true, message: "Grade saved", data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getGrades(req, res) {
    try {
      const exam_id = req.params.exam_id;
      const data = await ExamsService.getGrades(exam_id, req.instituteId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async addBulkGrades(req, res) {
    try {
      const exam_id = req.params.exam_id;
      const exam = await ExamsService.getExamById(exam_id, req.instituteId);
      if (!exam) {
        return res.status(404).json({ success: false, message: "Exam not found" });
      }

      if (exam.marks_status === 'Submitted') {
        return res.status(403).json({ success: false, message: "Marks are locked and cannot be modified." });
      }

      const roleId = Number(req.user.role_id);
      const isTeacher = roleId === 3 || roleId === 4;
      if (isTeacher) {
        const staffRes = await pool.query("SELECT staff_id FROM staff WHERE user_id = $1 AND institute_id = $2", [req.user.user_id, req.instituteId]);
        if (staffRes.rows.length === 0) {
          return res.status(403).json({ success: false, message: "Faculty record not found." });
        }
        const staffId = staffRes.rows[0].staff_id;

        const scheduleRes = await pool.query(
          "SELECT 1 FROM schedule WHERE class_id = $1 AND subject_id = $2 AND staff_id = $3 AND institute_id = $4 LIMIT 1",
          [exam.class_id, exam.subject_id, staffId, req.instituteId]
        );
        if (scheduleRes.rows.length === 0) {
          return res.status(403).json({ success: false, message: "You are not authorized to enter grades for this subject/class." });
        }
      }

      if (req.body.grades && Array.isArray(req.body.grades)) {
        for (const item of req.body.grades) {
          const marks = parseFloat(item.marks_obtained);
          if (isNaN(marks) || marks < 0 || (exam.total_score && marks > exam.total_score)) {
            return res.status(400).json({ success: false, message: `Marks obtained (${marks}) cannot exceed total score (${exam.total_score}) or be less than 0.` });
          }
        }
      }

      const data = await ExamsService.addBulkGrades(exam_id, req.body.grades, req.instituteId);

      const status = req.body.status;
      if (status && ['Draft', 'Submitted'].includes(status)) {
        await pool.query("UPDATE exam SET marks_status = $1, updated_at = now() WHERE exam_id = $2 AND institute_id = $3", [status, exam_id, req.instituteId]);
      }

      res.json({ success: true, message: "Grades saved successfully", data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

};

export default ExamsController;
