import { FacultyModel } from "../models/faculty_Model.js";

export const FacultyService = {

  async getAllFaculty(authUser) {
  return await FacultyModel.getAll(authUser.institute_id);
  },


  async getFacultyById(id) {
    const faculty = await FacultyModel.findById(Number(id));
    if (!faculty)
      throw Object.assign(new Error("Faculty not found"), { status: 404 });
    return faculty;
  },

  async createFaculty(payload, authUser) {
    if (!authUser?.user_id || !authUser?.institute_id) {
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    }

    return await FacultyModel.createFacultyTransaction(payload, authUser);
  },


  async updateFaculty(id, payload) {
    const fields = Object.keys(payload);
    const set = fields.map((f, i) => `${f} = $${i + 1}`);
    const values = fields.map(f => payload[f]);
    values.push(id);

    const query = `
      UPDATE staff
      SET ${set.join(", ")}
      WHERE staff_id = $${values.length}
      RETURNING *;
    `;

    return await FacultyModel.update(query, values);
  },

  async deleteFaculty(id) {
    return await FacultyModel.softDelete(Number(id));
  },
};
