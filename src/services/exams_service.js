import ExamsModel from "../models/exams_model.js";

const ExamsService = {

  createExam(payload) {
    return ExamsModel.createExam(payload);
  },

  getAllExams() {
    return ExamsModel.getAllExams();
  },

  updateExam(id, payload) {
    return ExamsModel.updateExam(id, payload);
  },

  deleteExam(id) {
    return ExamsModel.deleteExam(id);
  },

  getExamTypes() {
    return ExamsModel.getExamTypes();
  },

  addGrades(exam_id, payload) {
    return ExamsModel.addGrades(exam_id, payload);
  }

};

export default ExamsService;
