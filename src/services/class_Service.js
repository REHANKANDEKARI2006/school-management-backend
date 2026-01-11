import { ClassModel } from "../models/class_Model.js";

export const ClassService = {

  async getAllClasses() {
    return await ClassModel.getAll();
  },

  async getClassById(classId) {
    const id = parseInt(classId);
    if (isNaN(id)) {
      throw Object.assign(new Error("Invalid class id"), { status: 400 });
    }

    const data = await ClassModel.findById(id);
    if (!data) {
      throw Object.assign(new Error("Class not found"), { status: 404 });
    }

    return data;
  },

  // 🔥 YAHI FUNCTION MISSING THA
  async createClass(payload) {
    const classData = {
      class_name: (payload.class_name || "").trim(),
      section_id: payload.section_id ?? null,
      staff_id: payload.staff_id ?? null,
      room_number: payload.room_number ?? null
    };

    if (!classData.class_name || !classData.section_id) {
      throw Object.assign(
        new Error("class_name and section_id are required"),
        { status: 400 }
      );
    }

    return await ClassModel.create(classData);
  },

  async updateClass(classId, newValues) {
    const id = parseInt(classId);
    if (isNaN(id)) {
      throw Object.assign(new Error("Invalid class id"), { status: 400 });
    }

    delete newValues.class_id;

    const allowed = ["class_name", "section_id", "staff_id", "room_number"];
    const fields = Object.keys(newValues).filter(f => allowed.includes(f));

    if (fields.length === 0) {
      throw Object.assign(
        new Error("No valid fields provided"),
        { status: 400 }
      );
    }

    const setClause = fields.map((f, i) => `${f} = $${i + 1}`);
    const values = fields.map(f => newValues[f]);
    values.push(id);

    const query = `
      UPDATE class
      SET ${setClause.join(", ")}
      WHERE class_id = $${values.length}
      RETURNING *;
    `;

    const updated = await ClassModel.update(query, values);
    if (!updated) {
      throw Object.assign(new Error("Class not found"), { status: 404 });
    }

    return updated;
  },

  async deleteClass(classId) {
    const id = parseInt(classId);
    if (isNaN(id)) {
      throw Object.assign(new Error("Invalid class id"), { status: 400 });
    }

    const exists = await ClassModel.findById(id);
    if (!exists) {
      throw Object.assign(new Error("Class not found"), { status: 404 });
    }

    await ClassModel.delete(id);
    return { message: "Class deleted successfully" };
  }
};
