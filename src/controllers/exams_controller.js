import ExamsService from "../services/exams_service.js";

const ExamsController = {

  async createExam(req, res) {
    try {
      const data = await ExamsService.createExam(req.body);
      res.json({ success: true, message: "Exam created", data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getAllExams(req, res) {
    try {
      const data = await ExamsService.getAllExams();
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

  

  async addGrades(req, res) {
    try {
      const exam_id = req.params.exam_id;
      const data = await ExamsService.addGrades(exam_id, req.body);

      res.json({
        success: true,
        message: "Grades added successfully",
        data
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }
  

};

export default ExamsController;
