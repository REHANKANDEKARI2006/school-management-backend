import { ClassModel } from "../models/class_Model.js";

const parseIntegerOrNull = (val) => {
  if (val === "" || val === null || val === undefined) return null;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
};

export const ClassService = {

  async getAllClasses(instituteId) {
    return await ClassModel.getAll(instituteId);
  },

  async getAllClassesForAdmin(instituteId) {
    return await ClassModel.getAllForAdmin(instituteId);
  },

  async getClassById(classId, instituteId) {
    const id = parseInt(classId);
    if (isNaN(id)) {
      throw Object.assign(new Error("Invalid class id"), { status: 400 });
    }

    const data = await ClassModel.findById(id, instituteId);
    if (!data) {
      throw Object.assign(new Error("Class not found"), { status: 404 });
    }

    return data;
  },

  async createClass(payload, instituteId) {
    const classData = {
      class_name: (payload.class_name || "").trim(),
      section_id: parseIntegerOrNull(payload.section_id),   // ✅ KEEP (DO NOT REMOVE)
      staff_id: parseIntegerOrNull(payload.staff_id),
      room_number: payload.room_number ?? null,
    };

    if (!classData.class_name || !classData.section_id) {
      throw Object.assign(
        new Error("class_name and section_id are required"),
        { status: 400 }
      );
    }

    // ✅ 1. PREVENT DUPLICATE CLASSES (Name + Section combination)
    const allClasses = await ClassModel.getAll(instituteId);

    const isDuplicate = allClasses.some(
      (c) => 
        c.class_name.toLowerCase() === classData.class_name.toLowerCase() && 
        Number(c.section_id) === Number(classData.section_id)
    );

    if (isDuplicate) {
      throw Object.assign(new Error("Class with this name and section already exists"), { status: 409 });
    }

    if (classData.staff_id) {
      const isTeacherAssigned = allClasses.some(
        (c) => Number(c.staff_id) === Number(classData.staff_id)
      );

      if (isTeacherAssigned) {
        throw Object.assign(new Error("Class Teacher Already Exists"), { status: 409 });
      }
    }

    // ✅ 2. CREATE CLASS (EXISTING LOGIC)
    const createdClass = await ClassModel.create(classData, instituteId);

    // ✅ 2. MAP CLASS ↔ SECTION (NEW – REQUIRED)
    await ClassModel.attachSection(
      createdClass.class_id,
      classData.section_id
    );

    return createdClass;
  },

  async updateClass(classId, newValues, instituteId) {
    const id = parseInt(classId);
    if (isNaN(id)) {
      throw Object.assign(new Error("Invalid class id"), { status: 400 });
    }

    delete newValues.class_id;

    if (newValues.section_id !== undefined) {
      newValues.section_id = parseIntegerOrNull(newValues.section_id);
    }
    if (newValues.staff_id !== undefined) {
      newValues.staff_id = parseIntegerOrNull(newValues.staff_id);
    }

    const allowed = ["class_name", "section_id", "staff_id", "room_number"];
    const fields = Object.keys(newValues).filter(f => allowed.includes(f));

    if (fields.length === 0) {
      throw Object.assign(
        new Error("No valid fields provided"),
        { status: 400 }
      );
    }

    const allClasses = await ClassModel.getAll(instituteId);

    if (newValues.class_name || newValues.section_id) {
      const existing = await ClassModel.findById(id, instituteId);
      if (!existing) {
        throw Object.assign(new Error("Class not found"), { status: 404 });
      }
      const nameToCheck = (newValues.class_name || existing.class_name).trim().toLowerCase();
      const sectionToCheck = Number(newValues.section_id || existing.section_id);

      const isDuplicate = allClasses.some(
        (c) =>
          c.class_name.toLowerCase() === nameToCheck &&
          Number(c.section_id) === sectionToCheck &&
          c.class_id !== id
      );

      if (isDuplicate) {
        throw Object.assign(new Error("Class with this name and section already exists"), { status: 409 });
      }
    }

    if (newValues.staff_id) {
      const isTeacherAssigned = allClasses.some(
        (c) => Number(c.staff_id) === Number(newValues.staff_id) && c.class_id !== id
      );

      if (isTeacherAssigned) {
        throw Object.assign(new Error("Class Teacher is already assigned to another class"), { status: 409 });
      }
    }

    const setClause = fields.map((f, i) => `${f} = $${i + 1}`);
    const values = fields.map(f => newValues[f]);
    values.push(id);
    values.push(Number(instituteId));

    const query = `
      UPDATE class
      SET ${setClause.join(", ")}
      WHERE class_id = $${values.length - 1} AND institute_id = $${values.length}
      RETURNING *;
    `;

    const updated = await ClassModel.update(query, values);
    if (!updated) {
      throw Object.assign(new Error("Class not found"), { status: 404 });
    }

    return updated;
  },

  async deleteClass(classId, instituteId) {
    const id = parseInt(classId);
    if (isNaN(id)) {
      throw Object.assign(new Error("Invalid class id"), { status: 400 });
    }

    const exists = await ClassModel.findById(id, instituteId);
    if (!exists) {
      throw Object.assign(new Error("Class not found"), { status: 404 });
    }

    await ClassModel.softDelete(id, instituteId);
    return { message: "Class deleted successfully" };
  },
};
