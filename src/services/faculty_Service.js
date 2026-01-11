// services/faculty_Service.js
import { FacultyModel } from "../models/faculty_Model.js";

export const FacultyService = {

  async getAllFaculty() {
    return await FacultyModel.getAll();
  },

  async getFacultyById(id) {
    const facultyId = parseInt(id);
    if (isNaN(facultyId))
      throw Object.assign(new Error("Invalid faculty id"), { status: 400 });

    const faculty = await FacultyModel.findById(facultyId);
    if (!faculty)
      throw Object.assign(new Error("Faculty not found"), { status: 404 });

    return faculty;
  },

  async createFaculty(payload) {
    const faculty = {
      first_name: (payload.first_name || "").trim(),
      last_name: (payload.last_name || "").trim(),
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      status: payload.status ?? null,
      joined_date: payload.joined_date ?? null,
    };

    if (!faculty.first_name || !faculty.last_name) {
      throw Object.assign(
        new Error("First name and last name are required"),
        { status: 400 }
      );
    }

    return await FacultyModel.create(faculty);
  },

  async updateFaculty(id, newValues) {
    const facultyId = parseInt(id);
    if (isNaN(facultyId))
      throw Object.assign(new Error("Invalid faculty id"), { status: 400 });

    delete newValues.staff_id;

    const allowed = [
      "first_name",
      "last_name",
      "email",
      "phone",
      "status",
      "joined_date",
    ];

    const fields = Object.keys(newValues).filter(f =>
      allowed.includes(f)
    );

    if (fields.length === 0)
      throw Object.assign(
        new Error("No valid fields provided for update"),
        { status: 400 }
      );

    const setClause = fields.map(
      (f, i) => `${f} = $${i + 1}`
    );
    const values = fields.map(f => newValues[f]);
    values.push(facultyId);

    const query = `
      UPDATE staff
      SET ${setClause.join(", ")}
      WHERE staff_id = $${values.length}
      RETURNING *;
    `;

    const updated = await FacultyModel.update(query, values);
    if (!updated)
      throw Object.assign(new Error("Faculty not found"), { status: 404 });

    return updated;
  },




    async deleteFaculty(facultyId) {
        const id = parseInt(facultyId);
        if (isNaN(id)) {
        throw Object.assign(new Error("Invalid faculty id"), { status: 400 });
        }

        const exists = await FacultyModel.findById(id);
        if (!exists) {
        throw Object.assign(new Error("Faculty not found"), { status: 404 });
        }

        const query = `
        UPDATE staff
        SET status_id = $1
        WHERE staff_id = $2
        RETURNING *;
        `;

        const INACTIVE_STATUS_ID = 2;

        const updated = await FacultyModel.update(query, [
        INACTIVE_STATUS_ID,
        id,
        ]);

        return updated;
    }

};
