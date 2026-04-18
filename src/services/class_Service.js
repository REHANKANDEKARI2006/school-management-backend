import { ClassModel } from "../models/class_Model.js";

export const ClassService = {

  async getAllClasses() {
    return await ClassModel.getAll();
  },

  async getAllClassesForAdmin() {
    return await ClassModel.getAllForAdmin();
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

  async createClass(payload) {
    const classData = {
      class_name: (payload.class_name || "").trim(),
      section_id: payload.section_id ?? null,   // ✅ KEEP (DO NOT REMOVE)
      staff_id: payload.staff_id ?? null,
      room_number: payload.room_number ?? null,
    };

    if (!classData.class_name || !classData.section_id) {
      throw Object.assign(
        new Error("class_name and section_id are required"),
        { status: 400 }
      );
    }

    // ✅ 1. PREVENT DUPLICATE CLASSES (NEW - STRICT UNIQUENESS)
    const allClasses = await ClassModel.getAll();

    const isClassNameDuplicate = allClasses.some(
      (c) => c.class_name.toLowerCase() === classData.class_name.toLowerCase()
    );

    if (isClassNameDuplicate) {
      throw Object.assign(new Error("Class Name Already Exists"), { status: 409 });
    }

    if (classData.staff_id) {
      const isTeacherAssigned = allClasses.some(
        (c) => c.staff_id === Number(classData.staff_id)
      );

      if (isTeacherAssigned) {
        throw Object.assign(new Error("Class Teacher Already Exists"), { status: 409 });
      }
    }

    // ✅ 2. CREATE CLASS (EXISTING LOGIC)
    const createdClass = await ClassModel.create(classData);

    // ✅ 2. MAP CLASS ↔ SECTION (NEW – REQUIRED)
    await ClassModel.attachSection(
      createdClass.class_id,
      classData.section_id
    );

    return createdClass;
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

    const allClasses = await ClassModel.getAll();

    if (newValues.class_name) {
      const isClassNameDuplicate = allClasses.some(
        (c) =>
          c.class_name.toLowerCase() === newValues.class_name.trim().toLowerCase() &&
          c.class_id !== id
      );

      if (isClassNameDuplicate) {
        throw Object.assign(new Error("Class Name Already Exists"), { status: 409 });
      }
    }

    if (newValues.staff_id) {
      const isTeacherAssigned = allClasses.some(
        (c) => c.staff_id === Number(newValues.staff_id) && c.class_id !== id
      );

      if (isTeacherAssigned) {
        throw Object.assign(new Error("Class Teacher Already Exists"), { status: 409 });
      }
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

    await ClassModel.softDelete(id);
    return { message: "Class deleted successfully" };
  },
};
