import { GuardianModel } from "../models/guardian_Model.js";

export const GuardianService = {
  async createGuardian(payload) {
    if (!payload.student_id) {
      throw Object.assign(new Error("student_id required for guardian"), {
        status: 400,
      });
    }

    const guardian = {
      guardian_user_id: payload.guardian_user_id || null,
      grdn_first_name: payload.fatherName || "-",
      grdn_last_name: payload.motherName || "-",
      student_id: payload.student_id,
      phone: payload.primaryContact || null,
      email: payload.parentEmail || null,
      address: payload.address || null,
      gender_id: null,
      user_status_id: 1,
    };

    return await GuardianModel.create(guardian);
  },
};
