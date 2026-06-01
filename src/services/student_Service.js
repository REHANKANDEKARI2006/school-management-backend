import { StudentModel } from "../models/student_Model.js";

export const StudentService = {
  async getAllStudents(instituteId) {
    return await StudentModel.getAll(instituteId);
  },

  async getStudentsByClassId(classId, instituteId) {
    return await StudentModel.getByClassId(classId, instituteId);
  },

  async getStudentById(studentId) {
    const id = Number(studentId);
    if (isNaN(id))
      throw Object.assign(new Error("Invalid student id"), { status: 400 });

    const s = await StudentModel.findById(id);
    if (!s)
      throw Object.assign(new Error("Student not found"), { status: 404 });

    // 🔥 REQUIRED FIX:
    // Model already returns blood_group + guardian via JOIN
    // Do NOT remap — return as-is
    return s;
  },

  // ✅✅✅ ONLY REQUIRED ADDITION
  async createStudent(data, authUser) {
    return await StudentModel.createStudent(data, authUser);
  },

  async updateStudent(studentId, newValues) {
    const id = Number(studentId);
    if (isNaN(id))
      throw Object.assign(new Error("Invalid student id"), { status: 400 });

    delete newValues.student_id;
    return await StudentModel.updateById(id, newValues);
  },

  async deleteStudent(studentId) {
    const id = Number(studentId);
    if (isNaN(id))
      throw Object.assign(new Error("Invalid student id"), { status: 400 });

    const updated = await StudentModel.softDeleteById(id);
    if (!updated)
      throw Object.assign(new Error("Student not found"), { status: 404 });

    return { message: "Student removed (soft delete)" };
  },

  async getStudentByUserId(userId) {
    return await StudentModel.findByUserId(userId);
  },
};
