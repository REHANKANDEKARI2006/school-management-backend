import { FacultyModel } from "../models/faculty_Model.js";

export const FacultyService = {

  async getAllFaculty(authUser) {
    if (!authUser?.institute_id) {
      throw Object.assign(new Error("Unauthorized: Institute ID missing from token"), { status: 401 });
    }
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
    // Map 'avatar' to 'profile_url' for database consistency
    if (payload.avatar && !payload.profile_url) {
      payload.profile_url = payload.avatar;
      delete payload.avatar;
    }

    return await FacultyModel.updateFacultyTransaction(Number(id), payload);
  },

  async deleteFaculty(id) {
    return await FacultyModel.softDelete(Number(id));
  },
};
