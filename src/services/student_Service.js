import { StudentModel } from "../models/student_Model.js";

export const StudentService = {
  async getAllStudents() {
    return await StudentModel.getAll();
  },

  async getStudentById(studentId) {
    const id = parseInt(studentId);
    if (isNaN(id)) throw Object.assign(new Error("Invalid student id"), { status: 400 });

    const student = await StudentModel.findById(id);
    if (!student) throw Object.assign(new Error("Student not found"), { status: 404 });

    return student;
  },

  async createStudent(payload) {
    const student = {
      user_id: payload.user_id ?? null,
      stu_first_name: (payload.stu_first_name || "").trim(),
      stu_middle_name: (payload.stu_middle_name || "").trim(),
      stu_last_name: (payload.stu_last_name || "").trim(),
      email: payload.email ?? null,
      status: payload.status ?? null,
      address: payload.address ?? null,
      date_of_birth: payload.date_of_birth ?? null,
      bg_id: payload.bg_id ?? null,
      joined_date: payload.joined_date ?? null,
      gender_id: payload.gender_id ?? null
    };

    if (!student.stu_first_name || !student.stu_last_name) {
      throw Object.assign(new Error("First name and last name are required"), { status: 400 });
    }

    return await StudentModel.create(student);
  },

  async updateStudent(studentId, newValues) {
    const id = parseInt(studentId);
    if (isNaN(id)) throw Object.assign(new Error("Invalid student id"), { status: 400 });

    delete newValues.student_id;

    const allowed = [
      "user_id","stu_first_name","stu_middle_name","stu_last_name","email",
      "status","address","date_of_birth","bg_id","joined_date","gender_id"
    ];

    const fields = Object.keys(newValues).filter(k => allowed.includes(k));

    if (fields.length === 0)
      throw Object.assign(new Error("No valid fields provided for update"), { status: 400 });

    const setClause = fields.map((f, i) => `${f} = $${i + 1}`);
    const values = fields.map(f => newValues[f]);
    values.push(id);

    const query = `
      UPDATE student
      SET ${setClause.join(", ")}
      WHERE student_id = $${values.length}
      RETURNING *;
    `;

    const updated = await StudentModel.update(query, values);
    if (!updated) throw Object.assign(new Error("Student not found"), { status: 404 });

    return updated;
  },

  async deleteStudent(studentId) {
    const id = parseInt(studentId);
    if (isNaN(id)) throw Object.assign(new Error("Invalid student id"), { status: 400 });

    const exists = await StudentModel.findById(id);
    if (!exists) throw Object.assign(new Error("Student not found"), { status: 404 });

    const deleted = await StudentModel.delete(id);
    if (deleted === 0)
      throw Object.assign(new Error("Delete failed"), { status: 500 });

    return { message: "Student deleted successfully" };
  }
};
