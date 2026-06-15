import ExamsModel from "../models/exams_model.js";

const ExamsService = {

  async createExam(payload, instituteId) {
    const { class_id } = payload; // class_id now holds the Standard name (e.g. "10")

    // 1. Fetch all classes for this institute
    const { ClassModel } = await import("../models/class_Model.js");
    const allClasses = await ClassModel.getAll(instituteId);

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
      
      const created = await ExamsModel.createExam(dbPayload, instituteId);
      results.push(created);
    }

    return results[0];
  },

  getAllExams(class_id = null, instituteId) {
    return ExamsModel.getAllExams(class_id, instituteId);
  },

  getExamById(id, instituteId) {
    return ExamsModel.getExamById(id, instituteId);
  },

  updateExam(id, payload, instituteId) {
    return ExamsModel.updateExam(id, payload, instituteId);
  },

  deleteExam(id, instituteId) {
    return ExamsModel.deleteExam(id, instituteId);
  },

  getExamTypes() {
    return ExamsModel.getExamTypes();
  },

  getExamStatuses() {
    return ExamsModel.getExamStatuses();
  },

  addGrades(exam_id, payload, instituteId) {
    return ExamsModel.addGrades(exam_id, payload, instituteId);
  },

  getGrades(exam_id, instituteId) {
    return ExamsModel.getGrades(exam_id, instituteId);
  },

  addBulkGrades(exam_id, grades, instituteId) {
    return ExamsModel.addBulkGrades(exam_id, grades, instituteId);
  }

};

export default ExamsService;
