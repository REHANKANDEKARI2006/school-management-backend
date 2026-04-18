import ExamsModel from "../models/exams_model.js";

const ExamsService = {

  async createExam(payload) {
    const { class_id } = payload; // class_id now holds the Standard name (e.g. "10")

    // 1. Fetch all classes
    const { ClassModel } = await import("../models/class_Model.js");
    const allClasses = await ClassModel.getAll();

    // 2. Filter classes that match the requested Standard
    const matchingClasses = allClasses.filter(c => String(c.class_name).trim() === String(class_id).trim());

    if (matchingClasses.length === 0) {
      throw new Error(`No classes found for standard ${class_id}`);
    }

    // 3. Create exam for EVERY section in that standard
    const results = [];
    for (const cls of matchingClasses) {
      const dbPayload = {
        ...payload,
        class_id: cls.class_id,
      };
      
      const created = await ExamsModel.createExam(dbPayload);
      results.push(created);
    }

    return results[0];
  },

  getAllExams(class_id = null) {
    return ExamsModel.getAllExams(class_id);
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
