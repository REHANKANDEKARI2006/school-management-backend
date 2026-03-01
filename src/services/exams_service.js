import ExamsModel from "../models/exams_model.js";

const ExamsService = {

  createExam(payload) {
    return ExamsModel.createExam(payload);
  },

  getAllExams() {
    return ExamsModel.getAllExams();
  },

  getExamById(id) {
    return ExamsModel.getExamById(id);
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

  getExamStatuses() {
    return ExamsModel.getExamStatuses();
  },

  addGrades(exam_id, payload) {
    return ExamsModel.addGrades(exam_id, payload);
  },

  getGrades(exam_id) {
    return ExamsModel.getGrades(exam_id);
  },

  addBulkGrades(exam_id, grades) {
    return ExamsModel.addBulkGrades(exam_id, grades);
  }

};

export default ExamsService;
