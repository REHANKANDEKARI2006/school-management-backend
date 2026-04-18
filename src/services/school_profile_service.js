import { SchoolProfileModel } from "../models/school_profile_model.js";

export const SchoolProfileService = {
  async getProfile() {
    return await SchoolProfileModel.getProfile();
  },

  async upsertProfile(data) {
    return await SchoolProfileModel.upsertProfile(data);
  }
};
