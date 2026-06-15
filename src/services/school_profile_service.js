import { SchoolProfileModel } from "../models/school_profile_model.js";

export const SchoolProfileService = {
  async getProfile(instituteId) {
    return await SchoolProfileModel.getProfile(instituteId);
  },

  async upsertProfile(instituteId, data) {
    return await SchoolProfileModel.upsertProfile(instituteId, data);
  }
};
