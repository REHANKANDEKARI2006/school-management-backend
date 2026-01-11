import { StudentModel } from "../models/student_Model.js";

export const StudentService = {
  async getAllStudents() {
    return await StudentModel.getAll();
  },

  async getStudentById(studentId) {
    const id = Number(studentId);
    if (isNaN(id)) throw Object.assign(new Error("Invalid student id"), { status: 400 });

    const student = await StudentModel.findById(id);
    if (!student) throw Object.assign(new Error("Student not found"), { status: 404 });

    return student;
  },

  async createStudent(payload) {
    if (!payload.student_user_id) {
      throw Object.assign(
        new Error("student_user_id is required (FK from user table)"),
        { status: 400 }
      );
    }

    const student = {
      student_user_id: payload.student_user_id,
      stu_first_name: payload.stu_first_name?.trim(),
      stu_middle_name: payload.stu_middle_name || null,
      stu_last_name: payload.stu_last_name?.trim(),
      email: payload.email || null,
      address: payload.address || null,
      date_of_birth: payload.date_of_birth || null,
      gender_id: payload.gender_id || null,
      bg_id: payload.bg_id || null,
      joined_date: payload.joined_date || null,
      access_id: payload.access_id || null,
      user_status_id: payload.user_status_id || null
    };

    if (!student.stu_first_name || !student.stu_last_name) {
      throw Object.assign(
        new Error("First name and last name are required"),
        { status: 400 }
      );
    }

    return await StudentModel.create(student);
  },

  async updateStudent(studentId, newValues) {
    const id = Number(studentId);
    if (isNaN(id)) throw Object.assign(new Error("Invalid student id"), { status: 400 });

    delete newValues.student_id;

    return await StudentModel.updateById(id, newValues);
  },

  async deleteStudent(studentId) {
    const id = Number(studentId);
    if (isNaN(id)) throw Object.assign(new Error("Invalid student id"), { status: 400 });

    const deleted = await StudentModel.delete(id);
    if (!deleted) throw Object.assign(new Error("Student not found"), { status: 404 });

    return { message: "Student deleted successfully" };
  }
};
